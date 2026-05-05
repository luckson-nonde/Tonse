# Tonse-Hub System Design & Architecture

## System Identity Architecture

### Overview

Tonse-Hub implements a **Three-Tier Identity System** that provides multiple layers of identification for users while maintaining security, auditability, and user experience.

---

## 1. Identity Tiers

### Tier 1: NRC (National Registration Card) - Immutable Real-World Anchor

**Purpose**: Immutable, government-issued unique identifier for duplicate account prevention

**Characteristics**:

- Unique constraint at database level
- Government-issued identifier (real-world anchor)
- Never changes or exposed directly in APIs
- Used internally for account uniqueness verification
- Example: `ZA1234567890`

**Usage**:

- Registration: Required during user account creation
- Verification: Admin verification workflow
- Audit: All NRC operations logged
- Login: Optional (for admin/internal access)

---

### Tier 2: UUID - Internal System Identifier

**Purpose**: Universal unique identifier for database operations and internal system references

**Characteristics**:

- Generated automatically on user creation
- Used as database primary key
- System-internal identifier
- Format: Standard UUID v4
- Example: `550e8400-e29b-41d4-a716-446655440000`

**Usage**:

- Primary key for all user-related tables
- Foreign key relationships
- Internal service-to-service calls
- API request tracking
- Session management

---

### Tier 3: displayId - User-Facing Friendly ID

**Purpose**: Memorable, user-facing identifier for improved UX

**Characteristics**:

- Format: `USER-XXXXXX` (USER prefix + 6-char hash)
- Deterministically generated from user data (email + NRC)
- Non-sequential, secure, memorable
- URL-safe and shareable
- Example: `USER-A7F2K9`

**Generation Algorithm**:

```
1. Normalize user email and NRC
2. Create hash string: "{email}:{nrc}"
3. Generate SHA-256 hash
4. Extract first 6 hex characters
5. Format: USER-{uppercase_hash}
```

**Validation**:

- Regular expression: `/^USER-[A-Z0-9]{6}$/`
- Deterministic verification (same input = same displayId)

---

## 2. Core Architecture Components

### Entity Relationship Model

```
┌─────────────────────────────────────────────┐
│               User (Main Entity)            │
├─────────────────────────────────────────────┤
│ uuid (PK)                                   │
│ nrc (Unique)                                │
│ displayId                                   │
│ firstName, lastName                         │
│ status (PENDING, VERIFIED, SUSPENDED)       │
│ passwordHash                                │
│ createdAt, updatedAt                        │
└──────────────┬──────────────────────────────┘
               │
               ├──────────────────┬──────────────────┐
               │                  │                  │
        ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
        │ User Email  │  │ Identity Audit  │  │   JWT      │
        │   (Many)    │  │     (Many)      │  │   Token    │
        └─────────────┘  └─────────────────┘  └────────────┘
```

### Database Schema

#### User Entity

```typescript
{
  uuid: UUID (Primary Key)
  nrc: STRING (Unique, 50 chars)
  displayId: STRING (50 chars)
  firstName: STRING
  lastName: STRING
  status: ENUM (PENDING, VERIFIED, SUSPENDED)
  nrcVerifiedAt: TIMESTAMP (nullable)
  nrcVerificationNotes: TEXT (nullable)
  passwordHash: STRING (bcrypt)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

#### User Email Entity

```typescript
{
  id: UUID (Primary Key)
  userId: UUID (Foreign Key -> User)
  email: STRING (Unique)
  isPrimary: BOOLEAN
  isVerified: BOOLEAN
  verificationToken: STRING (nullable)
  verificationTokenExpiresAt: TIMESTAMP (nullable)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

#### Identity Audit Entity

```typescript
{
  id: UUID (Primary Key)
  userId: UUID (Foreign Key -> User)
  eventType: ENUM (REGISTRATION, LOGIN, EMAIL_CHANGED, NRC_VERIFIED, etc.)
  oldValue: JSON (nullable)
  newValue: JSON (nullable)
  ipAddress: STRING
  userAgent: STRING
  performedByAdminId: UUID (nullable)
  notes: TEXT (nullable)
  createdAt: TIMESTAMP
}
```

---

## 3. Service Layer

### UsersService (50+ Methods)

#### User Management

- `register(nrc, email, password, firstName, lastName)`: Create new user
- `findById(uuid)`: Find by internal UUID
- `findByNrc(nrc)`: Find by National Registration Card
- `findByDisplayId(displayId)`: Find by user-facing ID
- `findByAnyEmail(email)`: Find by any associated email
- `getFullProfile(uuid)`: Get complete user profile

#### Email Management

- `addEmail(userId, email)`: Add new email to user
- `removeEmail(userId, email)`: Remove email (cannot remove primary)
- `changePrimaryEmail(userId, email)`: Set new primary email
- `verifyEmail(userId, email, token)`: Verify email ownership
- `requestEmailVerification(userId, email)`: Send verification link
- `getAllEmails(userId)`: Get all user emails

#### NRC Verification

- `verifyNrc(userId, adminId, notes)`: Admin approve NRC
- `rejectNrc(userId, adminId, notes)`: Admin reject NRC
- `getNrcStatus(userId)`: Get verification status
- `getNrcVerificationQueue()`: Admin view pending verifications

#### Account Management

- `suspendAccount(userId, adminId, reason)`: Suspend account
- `reactivateAccount(userId, adminId)`: Reactivate suspended account
- `updateProfile(userId, data)`: Update user information
- `changePassword(userId, oldPassword, newPassword)`: Password change

#### Audit & Security

- `createAuditLog(userId, event, details)`: Log event
- `getAuditLogs(userId)`: Retrieve audit trail
- `getAuditLogsByEvent(eventType)`: Filter by event type
- `flagSuspiciousActivity(userId, reason)`: Security alert

---

## 4. Authentication & Authorization

### Login Methods

Users can authenticate using **ANY** of the three identity tiers:

1. **By Email** (Primary method)
   - Input: Email + Password
   - Lookup: Find by email in user_emails table
   - Response: User data with JWT token

2. **By Display ID**
   - Input: displayId + Password
   - Lookup: Direct user lookup
   - Response: User data with JWT token

3. **By NRC** (Admin/Internal only)
   - Input: NRC + Password
   - Lookup: Direct user lookup
   - Response: User data with JWT token

### JWT Token Structure

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "displayId": "USER-A7F2K9",
  "nrcMasked": "ZA12*****90",
  "iat": 1704000000,
  "exp": 1704086400
}
```

**Security Notes**:

- NRC masked in JWT (only first/last 2 chars visible)
- displayId included for user-facing operations
- UUID as subject for internal lookups
- 24-hour token expiry

---

## 5. Data Flow Diagrams

### Registration Flow

```
User Input
  ↓
Validate NRC (unique, format)
  ↓
Validate Email (unique, format)
  ↓
Hash Password (bcrypt, 10 rounds)
  ↓
Generate UUID
  ↓
Generate displayId (SHA-256)
  ↓
Create User Entity (status: PENDING)
  ↓
Create Primary Email Entity
  ↓
Create Initial Audit Log (REGISTRATION)
  ↓
Send Verification Email
  ↓
Return User with JWT
```

### NRC Verification Flow (Admin)

```
User Submits Registration
  ↓
Admin Reviews NRC
  ↓
Admin Decision (VERIFY/REJECT)
  ↓
Update User Status
  ↓
Create Audit Log with Admin Details
  ↓
Send Notification Email
  ↓
Update Frontend (auto-refresh)
```

### Login Flow

```
User Input (email/displayId + password)
  ↓
Find User by Identifier
  ↓
Verify Password (bcrypt compare)
  ↓
Check Account Status (not SUSPENDED)
  ↓
Generate JWT Token
  ↓
Create Audit Log (LOGIN)
  ↓
Return User + JWT
```

---

## 6. Security Features

### Password Security

- **Hashing**: bcrypt with 10 salt rounds
- **Minimum Length**: 8 characters
- **Complexity Requirements**: Mixed case, numbers, special chars
- **Expiry**: Optional password rotation policy

### NRC Security

- **Immutable**: Cannot be changed after registration
- **Unique Constraint**: Database-level enforcement
- **Masked in API**: Never returned in plaintext
- **Audit Trail**: All access logged with IP/admin

### Email Security

- **Verification**: 24-hour token expiry
- **Multiple Support**: Users can have multiple verified emails
- **Primary Email**: Designated for communication
- **Unique Constraint**: Per email address

### Audit Trail

- **Comprehensive Logging**: All identity changes logged
- **IP Tracking**: Source IP recorded for all operations
- **Admin Tracking**: Admin ID recorded for admin actions
- **Suspicious Activity**: Automatic flagging of unusual patterns

---

## 7. Implementation Status

### ✅ Completed

- [x] Core entities (User, UserEmail, IdentityAudit)
- [x] UsersService (50+ methods)
- [x] AuthService integration
- [x] Display ID generation and validation
- [x] Database migration
- [x] NRC verification workflow
- [x] Email management system
- [x] Audit logging
- [x] JWT token enhancement
- [x] Frontend types updated

### 📊 Statistics

- **Entities**: 3 (User, UserEmail, IdentityAudit)
- **Service Methods**: 50+
- **Audit Events**: 12+ event types
- **Database Tables**: 3 (users, user_emails, identity_audits)
- **API Endpoints**: Updated for 3-tier identity

---

## 8. API Endpoints

### Authentication

- `POST /auth/register` - Register with 3-tier identity
- `POST /auth/login` - Login by email/displayId/NRC
- `POST /auth/logout` - Logout and invalidate token

### User Management

- `GET /users/profile` - Get authenticated user profile
- `GET /users/:id` - Get user by UUID
- `PATCH /users/:id` - Update user profile
- `POST /users/:id/password` - Change password

### Email Management

- `GET /users/:id/emails` - List all emails
- `POST /users/:id/emails` - Add new email
- `DELETE /users/:id/emails/:email` - Remove email
- `PATCH /users/:id/emails/:email/primary` - Set primary
- `POST /users/:id/emails/:email/verify` - Verify ownership

### Admin - NRC Verification

- `GET /admin/nrc-queue` - Get pending verifications
- `POST /admin/nrc/:id/verify` - Approve NRC
- `POST /admin/nrc/:id/reject` - Reject NRC

### Admin - Account Management

- `POST /admin/users/:id/suspend` - Suspend account
- `POST /admin/users/:id/reactivate` - Reactivate account
- `GET /admin/users/:id/audit` - Get audit trail

---

## 9. Best Practices

### For Developers

- Always use UUID for internal operations
- Use displayId only for user-facing UI
- Never log or expose full NRC
- Always create audit logs for sensitive operations
- Use normalized email addresses for lookups
- Implement rate limiting on authentication endpoints

### For Admin

- Review NRC documentation with user
- Maintain audit trail logs for compliance
- Monitor suspicious activity flags
- Use strong passwords for admin accounts
- Rotate access tokens regularly

### For Frontend

- Display displayId to users (e.g., "USER-A7F2K9")
- Use UUID for API calls (fetch /users/:uuid)
- Store JWT in secure httpOnly cookies
- Implement auto-logout on token expiry
- Handle multiple email addresses in UI

---

## 10. Dropdown & Select Component Design Rules

### Rule 1: Obvious Trigger (Visibility)

**Make the dropdown trigger immediately recognizable as clickable**

- ✅ **Visible Arrow**: Clear chevron or arrow icon indicating state
  - Down arrow (default): `↓` or `<ChevronDown />`
  - Up arrow (open): `↑` or `<ChevronUp />`
- ✅ **Hover State**: Visual feedback on hover
  - Background color change
  - Border highlight
  - Scale/shadow effect
  - Cursor changes to pointer
- ✅ **Minimum Click Target**: 44px × 44px (mobile accessibility)
  - Button height minimum: 44px
  - Padding around text/icon
  - Touch-friendly sizing
- ✅ **Focus State**: Keyboard focus indicator
  - Ring or outline on focus
  - Meets WCAG AA contrast requirements

**Implementation**:

```typescript
// ✓ Obvious, clickable, accessible
<button
  className="h-11 px-4 border-2 rounded-lg hover:bg-gray-50
             focus:ring-2 focus:ring-brand transition-all"
  aria-haspopup="listbox"
  aria-expanded={isOpen}
>
  <span>{selected}</span>
  <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
</button>
```

---

### Rule 2: Smart Positioning (Viewport Edge Detection)

**Never let dropdown items get cut off by the viewport**

- ✅ **Flip on Edge**:
  - Detect if bottom space is insufficient
  - Open upward instead (above the trigger)
  - Reverse item order if needed
- ✅ **Never Clip Last Item**:
  - Account for max-height and scrolling
  - Ensure last item is always visible
  - Add bottom margin for safety
- ✅ **Stay Within Viewport**:
  - Detect left/right edges
  - Shift horizontally if needed
  - Never go off-screen

**Implementation**:

```typescript
// Smart positioning with Popper.js or Floating UI
<Popover.Content
  side="bottom"
  sideOffset={8}
  onOpenAutoFocus={(e) => e.preventDefault()}
  avoidCollisions
  collisionPadding={16}
  alignOffset={0}
>
  {/* Dropdown content */}
</Popover.Content>
```

---

### Rule 3: Keyboard Navigation (Non-Optional)

**Every dropdown must be fully keyboard accessible - arrow keys, Enter, Escape**

- ✅ **Arrow Keys**: Move through items
  - `ArrowDown`: Next item, wrap to first
  - `ArrowUp`: Previous item, wrap to last
  - Highlight changes as user navigates
- ✅ **Enter/Space**: Select current item
  - Closes dropdown
  - Updates selected value
  - Triggers onChange callback
- ✅ **Escape**: Close dropdown
  - Focus returns to trigger
  - No selection change
  - Works even when typing in search
- ✅ **Home/End**: Jump to first/last item
  - `Home`: Jump to first
  - `End`: Jump to last

**Implementation**:

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % items.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + items.length) % items.length);
      break;
    case 'Enter':
      e.preventDefault();
      onSelect(items[highlighted]);
      setIsOpen(false);
      break;
    case 'Escape':
      e.preventDefault();
      setIsOpen(false);
      break;
    case 'Home':
      e.preventDefault();
      setHighlighted(0);
      break;
    case 'End':
      e.preventDefault();
      setHighlighted(items.length - 1);
      break;
  }
};
```

---

### Rule 4: Search & Filtering (10+ Items)

**Don't make users scroll through long lists**

- ✅ **Add Search at 10+ Items**:
  - Text input to filter list
  - Real-time filtering as user types
  - Shows "No results" message if empty
  - Search is case-insensitive
- ✅ **Filter Logic**:
  - Match start of item name (preferred)
  - Or match anywhere in name
  - Highlight matched text
- ✅ **Virtualization at 100+ Items**:
  - Use react-window or similar
  - Only render visible items in DOM
  - Maintains scroll position
  - Smooth scrolling with large lists

**Implementation**:

```typescript
// At 10+ items: Show search
{items.length >= 10 && (
  <input
    type="text"
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="px-3 py-2 border rounded m-2"
    autoFocus
  />
)}

// At 100+ items: Use virtualization
{items.length >= 100 ? (
  <FixedSizeList height={400} itemCount={filteredItems.length}>
    {({ index, style }) => (
      <Item style={style} item={filteredItems[index]} />
    )}
  </FixedSizeList>
) : (
  // Regular list for smaller datasets
  filteredItems.map(...)
)}
```

---

### Rule 5: Animation (150ms or Less)

**Fast animations feel instant, slow ones feel janky**

- ✅ **Target Duration**: 100-150ms
  - Under 100ms: Feels instant, less "smooth"
  - 150ms: Perfect sweet spot
  - Over 200ms: Starts to feel sluggish
  - Over 300ms: Definitely feels janky
- ✅ **Easing Function**:
  - `ease-out` for open (quick start, smooth end)
  - `ease-in` for close (smooth start, quick end)
  - Avoid `ease-in-out` (feels unnatural)
- ✅ **What to Animate**:
  - Dropdown appear/disappear (opacity, scale)
  - Arrow rotation
  - Item highlight
  - Item enter (stagger for lists)

**Implementation**:

```typescript
// Framer Motion example
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
    >
      {/* Dropdown content */}
    </motion.div>
  )}
</AnimatePresence>

// Tailwind CSS example
<div className="transition-all duration-150 ease-out
               data-[state=open]:opacity-100 data-[state=closed]:opacity-0
               data-[state=open]:scale-100 data-[state=closed]:scale-95" />
```

---

### Checklist: Every Dropdown Must Have

- [ ] **Visibility**: 44px+ clickable area, arrow icon, hover state, focus ring
- [ ] **Positioning**: Detects viewport edges, flips direction, never clips items
- [ ] **Keyboard**: Arrow keys, Enter, Escape, Home/End all work
- [ ] **Search**: Added if 10+ items, filtered in real-time
- [ ] **Virtualization**: Implemented if 100+ items
- [ ] **Animation**: 150ms or less, uses ease-out
- [ ] **ARIA**: `aria-haspopup`, `aria-expanded`, `aria-selected`
- [ ] **Testing**: Works on mobile, tablet, desktop with keyboard and mouse

---

## 11. Deployment Checklist

- [ ] Run database migrations: `npm run migrate:up`
- [ ] Test user registration with NRC
- [ ] Test login by email/displayId/NRC
- [ ] Verify audit logs creation
- [ ] Test admin NRC verification workflow
- [ ] Test email management features
- [ ] Test account suspension/reactivation
- [ ] Verify JWT token generation
- [ ] Load test authentication endpoints
- [ ] Security audit of password storage
- [ ] Compliance review (OWASP, ISO 27001)

---

## 12. References

- **Repository Docs**:
  - [THREE_TIER_IDENTITY_SYSTEM_COMPLETE.md](THREE_TIER_IDENTITY_SYSTEM_COMPLETE.md)
  - [THREE_TIER_IDENTITY_DEVELOPER_REFERENCE.md](THREE_TIER_IDENTITY_DEVELOPER_REFERENCE.md)
  - [ID_MANAGEMENT_BEST_PRACTICES.md](ID_MANAGEMENT_BEST_PRACTICES.md)

- **Source Code**:
  - Backend: `backend/src/modules/users/`
  - Services: `backend/src/modules/auth/`
  - Utilities: `backend/src/utils/`
  - Types: `src/types.ts`

- **Dropdown Component Standards**:
  - [WAI-ARIA Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
  - [Keyboard Navigation Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
  - [Floating UI Documentation](https://floating-ui.com/)
  - [Radix UI Select Primitives](https://radix-ui.com/docs/primitives/components/select)

---

**Last Updated**: April 26, 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
