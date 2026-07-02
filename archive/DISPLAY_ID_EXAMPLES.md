# ID Management: Real-World Examples & Reference Guide

## Platform Comparison Matrix

### Display ID Formats Used by Major Platforms

```
Platform         | Internal         | Display Format      | Length | Use Case
─────────────────┼──────────────────┼────────────────────┼────────┼───────────────────
GitHub           | UUID             | #1234               | 5      | Issues/PRs
Stripe           | UUID             | cus_xxx, ch_xxx     | 20     | Billing entities
AWS              | UUID/Sequential  | i-1234567890abc     | 19     | Resource IDs
Jira             | UUID             | PROJ-1234           | 10     | Issues
Linear           | UUID             | PROJ-123            | 10     | Issues
Notion           | UUID             | Slug + Hash         | 40     | Pages
Shopify          | Sequential       | #1001234            | 8      | Orders
Uber             | UUID             | 16-char alphanum    | 16     | Trips
Amazon Orders    | Sequential       | 123-1234567-1234567 | 19     | Orders
Slack            | UUID             | Workspace ID        | 10     | Channels
Reddit           | Sequential       | Post ID             | 6      | Posts
Twitter          | Snowflake ID     | Tweet ID            | 19     | Tweets
```

---

## TONSE Marketplace: Recommended Format

### Current → Recommended Transition

```
CURRENT (PROBLEM):
├── InquiryDetails: "QID-fce43de0-339c-4706-a2e2-c9d70260061e" ✗ Too long
├── InquiryCard:    "QID-fce" ✗ Collision risk
└── Issue: Inconsistent, not user-friendly

RECOMMENDED (SOLUTION):
├── All components: "QID-8F2D3K" ✓ Consistent
├── Database:       displayId column (12 chars)
├── UUID column:    Still stores full UUID internally
└── Result: User-friendly, secure, scalable
```

### Display ID Anatomy

```
QID - 8F2D3K
│    └── Deterministic hash (6 alphanumeric characters)
│
└── Type prefix (Quotation/Inquiry ID)

Examples:
  QID-8F2D3K  → Inquiry
  QOT-ABC7KX  → Quote
  ORD-XYZ456  → Order
  PAY-def789  → Payment
  SHP-123MNO  → Shipment
```

---

## Real-World Implementation Examples

### Example 1: Stripe-Style Implementation

**How Stripe generates IDs:**

```typescript
// Stripe format: prefix_environment_hash
// Example: cus_test_4eC39HqLyjWDarhtQqADiK0

function stripeStyleId(type: string, uuid: string, env: 'test' | 'live' = 'test'): string {
  const prefix = {
    customer: 'cus',
    charge: 'ch',
    invoice: 'in',
    payment_intent: 'pi',
  }[type];

  const hash = crypto.createHash('md5').update(uuid).digest('hex').slice(0, 20).toUpperCase();

  return `${prefix}_${env}_${hash}`;
}

// Usage
const customerId = stripeStyleId('customer', 'fce43de0-339c-4706-a2e2-c9d70260061e', 'live');
// Returns: "cus_live_FCE43DE0339C4706A2E2C9D702" (26 chars)
```

**Why Stripe does this:**

- Type prefix immediately identifies resource
- Environment marker prevents test/live confusion
- Hash ensures non-sequential IDs
- Professional, API-like appearance

---

### Example 2: AWS EC2 Instance IDs

**How AWS generates resource IDs:**

```typescript
// AWS format: [resource-type]-[environment]-[hash]
// Example: i-0c6e1d28975fbf10f (19 chars)

function awsStyleId(resourceType: string, uuid: string): string {
  const prefixes = {
    instance: 'i',
    image: 'ami',
    volume: 'vol',
    snapshot: 'snap',
    security_group: 'sg',
  };

  const prefix = prefixes[resourceType];
  const hash = crypto.createHash('sha256').update(uuid).digest('hex').slice(0, 17).toLowerCase();

  return `${prefix}-${hash}`;
}

// Usage
const instanceId = awsStyleId('instance', 'fce43de0-339c-4706-a2e2-c9d70260061e');
// Returns: "i-fce43de0339c4706a2e2c9d7026" (19 chars)
```

**Why AWS does this:**

- Resource type immediately clear from prefix
- Works in AWS CLI and API
- Not sequential (doesn't reveal scale)
- Consistent format across all resources

---

### Example 3: Jira Issue Keys

**How Jira generates issue identifiers:**

```typescript
// Jira format: PROJECT-COUNTER
// Deterministic but tied to project and sequence
// Example: PROJ-1234

interface JiraIssue {
  projectKey: string; // e.g., "PROJ"
  sequenceNumber: number; // e.g., 1234
  uuid: string; // e.g., "fce43de0-..."
}

function jiraStyleId(issue: JiraIssue): string {
  // Counter is sequential per project
  // Provides human-readable, sortable IDs
  return `${issue.projectKey}-${issue.sequenceNumber}`;
}

// Usage
const issueKey = jiraStyleId({
  projectKey: 'TONSE',
  sequenceNumber: 1234,
  uuid: 'fce43de0-339c-4706-a2e2-c9d70260061e',
});
// Returns: "TONSE-1234"
```

**Why Jira does this:**

- Very human-readable
- Works in emails, chat, documentation
- Project context built-in
- Sequential tracking per project

**Could work for TONSE if using per-category counters:**

```
MARKET-0012457    → Marketplace inquiry #12457
LABOUR-0002134    → Labour inquiry #2134
```

---

### Example 4: GitHub Issue/PR Numbers

**How GitHub identifies issues:**

```typescript
// GitHub format: Repository-relative numeric ID
// Example: https://github.com/owner/repo/issues/1234

function githubStyleId(repoName: string, sequenceNumber: number, uuid: string): string {
  // GitHub uses simple numeric sequential IDs per repository
  // This is feasible because repos are isolated namespaces

  // For display:
  return `#${sequenceNumber}`;

  // For URLs:
  return `https://github.com/${repoName}/issues/${sequenceNumber}`;
}

// Usage
const issueNumber = githubStyleId('tonse-hub', 1234, 'fce43de0-...');
// Display: "#1234"
// URL: "https://github.com/tonse-hub/tonse-hub/issues/1234"
```

**Why GitHub does this:**

- Simplicity (just numbers)
- Per-repo isolation means no collisions
- URL is the primary identifier
- Works in git commits, PRs, discussions

**Could work for TONSE with per-inquiry-type sequences:**

```
Inquiry #12457
Quote #5893
Order #1234
```

---

### Example 5: Uber/Lyft Ride IDs

**How ride-sharing apps identify trips:**

```typescript
// Uber format: alphanumeric code for support reference
// Example: A1B2C3D4-E5F6-G7H8 (shown in app, hidden in public)

function rideShareStyleId(uuid: string): string {
  // Goal: Short, memorable for customer support
  // NOT revealed to other users (privacy)

  const hash = crypto.createHash('sha256').update(uuid).digest().slice(0, 6);

  // Encode as alphanumeric
  return hash
    .toString('base64')
    .replace(/[^A-Z0-9]/g, '') // Keep only alphanumeric
    .slice(0, 8)
    .toUpperCase();
}

// Usage
const rideId = rideShareStyleId('fce43de0-339c-4706-a2e2-c9d70260061e');
// Returns: "FCDE339C" (8 chars)
// Display format: "Your ride confirmation: FCDE339C"
```

**Why Uber/Lyft do this:**

- Privacy (internal UUID not exposed)
- Customer support reference
- Short and memorable
- Non-sequential (doesn't reveal volume)

---

## TONSE-Specific Implementation Scenarios

### Scenario A: Simple Sequential (Easiest)

```
Format: QID-012457
Database:
  - id: UUID (fce43de0-...)
  - display_id: "QID-012457"
  - sequence: 12457 (auto-increment)

Pros:
  ✓ Most readable
  ✓ Easy to explain ("Inquiry #12457")
  ✓ Traditional format
  ✓ Works for customer support

Cons:
  ✗ Reveals business metrics
  ✗ Vulnerable to enumeration
  ✗ Requires central counter

Implementation:
  CREATE SEQUENCE inquiry_seq START 1;
  UPDATE inquiries SET display_id = CONCAT('QID-', LPAD(nextval('inquiry_seq'), 6, '0'));
```

---

### Scenario B: Hash-Based (Recommended)

```
Format: QID-8F2D3K
Database:
  - id: UUID (fce43de0-...)
  - display_id: "QID-8F2D3K" (derived from UUID hash)

Pros:
  ✓ Non-sequential (secure)
  ✓ No central counter needed
  ✓ Deterministic
  ✓ Scalable across distributed systems
  ✓ Professional appearance

Cons:
  ✗ Slightly less memorable
  ✗ Cannot estimate scale from ID
  ✗ Requires hash computation

Implementation:
  display_id = 'QID-' + substr(sha256(id), 1, 6);
```

---

### Scenario C: Type-Prefixed Sequence

```
Format:
  QID-000001 (Inquiry)
  QOT-000001 (Quote)
  ORD-000001 (Order)

Database:
  - id: UUID
  - display_id: "QOT-000001"
  - sequence_per_type: Counter per resource type

Pros:
  ✓ Resource type immediately clear
  ✓ Sequential within each type
  ✓ Easy to track ("First quote of the day is QOT-000001")
  ✓ Clean separation of concerns

Cons:
  ✗ Multiple counters to manage
  ✗ Still reveals volume per type
  ✗ Requires per-type coordination

Implementation:
  CREATE SEQUENCE inquiry_seq;
  CREATE SEQUENCE quote_seq;
  CREATE SEQUENCE order_seq;

  display_id = resource_type_prefix + LPAD(seq_value, 6, '0');
```

---

### Scenario D: Category-Prefixed Sequential

```
Format:
  MKT-012457 (Marketplace inquiry)
  LAB-008932 (Labour inquiry)
  MAC-005234 (Machinery inquiry)

Database:
  - id: UUID
  - display_id: "MKT-012457"
  - category: "marketplace"
  - sequence_per_category: Counter per category

Pros:
  ✓ Category context built into ID
  ✓ Sequential within category
  ✓ Balances readability and scale hiding

Cons:
  ✗ Still reveals category volume
  ✗ Multiple counters to maintain
  ✗ ID length varies if categories have different lengths

Implementation:
  CREATE TABLE id_sequences (
    category VARCHAR(50) PRIMARY KEY,
    last_sequence BIGINT DEFAULT 0
  );

  // Generate next ID for category
  UPDATE id_sequences SET last_sequence = last_sequence + 1
  WHERE category = 'marketplace';

  // Result: MKT-012457
```

---

## Lookup Pattern Examples

### Pattern 1: Dual-Column (Recommended)

```sql
-- Schema
CREATE TABLE inquiries (
  id UUID PRIMARY KEY,
  display_id VARCHAR(12) UNIQUE NOT NULL,
  -- ...
  INDEX idx_display_id (display_id)
);

-- Lookup by display ID
SELECT * FROM inquiries WHERE display_id = 'QID-8F2D3K';

-- Lookup by UUID
SELECT * FROM inquiries WHERE id = 'fce43de0-339c-4706-a2e2-c9d70260061e';

-- Both indexed, both fast O(1) lookup
```

### Pattern 2: Derived Display ID (No Extra Column)

```typescript
// No display_id column
// Compute on-the-fly for API responses

async function formatInquiry(inquiry: RawInquiry) {
  return {
    ...inquiry,
    displayId: generateDisplayId(inquiry.id),  // Computed each time
  };
}

Advantages:
  - No extra storage
  - Consistent

Disadvantages:
  - Requires computation on each request
  - Cannot query by display ID directly (must query by UUID first)
  - API must translate display ID → UUID in requests
```

### Pattern 3: Cached Display ID (Best Performance)

```typescript
// Calculate once at creation, cache in database

async function createInquiry(data) {
  const inquiry = new Inquiry(data);
  inquiry.displayId = generateDisplayId(inquiry.id);
  await inquiry.save();
  return inquiry;
}

// Fast lookup by display_id
async function findByDisplayId(displayId: string) {
  return inquiries.findOne({ displayId });
}

Benefits:
  - Fast indexed lookup
  - No computation on each request
  - Human-readable in database
  - Flexible query options
```

---

## Error Handling Examples

### Handle Invalid Display IDs

```typescript
// User enters invalid ID
try {
  const inquiry = await inquiriesService.findByIdOrDisplayId('QID-INVALID');
} catch (error) {
  // Response to user
  {
    error: 'Inquiry not found',
    message: 'The inquiry reference "QID-INVALID" was not found.',
    suggestions: [
      'Check the inquiry number is correct',
      'Display IDs are case-insensitive (QID-abc123 or qid-abc123)',
      'Contact support if you need help finding your inquiry'
    ]
  }
}
```

### Handle ID Collisions (Rare but Possible)

```typescript
async function handleDisplayIdCollision(newInquiry: Inquiry, existingDisplayId: string) {
  // Very rare with 6-character hash (16.7M combinations)
  // But handle gracefully if it occurs

  let displayId = existingDisplayId;
  let attempt = 1;

  while (await inquiries.findOne({ displayId })) {
    // Expand to 7, 8 characters if collision occurs
    const newHash = generateDisplayId(newInquiry.id, 'inquiry').slice(4);
    displayId = `QID-${newHash}${attempt}`;
    attempt++;
  }

  return displayId;
}
```

---

## Performance Implications

### Storage Impact

```
Per Inquiry:
- UUID storage:              36 bytes
- Display ID storage:        12 bytes
- Extra storage overhead:    33% (12/36)

For 1 million inquiries:
- UUID column:               ~36 MB
- Display ID column:         ~12 MB
- Total extra:              ~12 MB (negligible)
```

### Query Performance

```
Scenario: 1 million inquiries

Lookup by UUID:
  - Index size: ~40 MB (UUID index)
  - Lookup time: O(1) avg, O(log n) worst
  - Speed: < 1ms

Lookup by display ID:
  - Index size: ~20 MB (shorter string)
  - Lookup time: O(1) avg, O(log n) worst
  - Speed: < 1ms

Both comparably fast with proper indexing
```

### Generation Performance

```
Method              | Time/ID    | Throughput    | Notes
────────────────────┼────────────┼───────────────┼──────────────────
Sequential counter  | < 0.1 ms   | 10,000+/sec   | Simple increment
Hash-based (SHA-256)| 0.1-0.2 ms | 5,000-10k/sec | One-time compute
Nanoid generator    | < 0.1 ms   | 100k+/sec     | Built for speed
```

For TONSE inquiry volume (assumed < 10k/day), performance impact is negligible.

---

## Migration Strategy for Existing Data

### Step 1: Add Display ID Column (Nullable)

```sql
ALTER TABLE inquiries ADD COLUMN display_id VARCHAR(12) UNIQUE;
```

### Step 2: Generate Display IDs for Existing Records

```sql
UPDATE inquiries
SET display_id = CONCAT(
  'QID-',
  SUBSTRING(SHA2(REPLACE(id, '-', ''), 256), 1, 6)
)
WHERE display_id IS NULL;
```

### Step 3: Make Not Null

```sql
ALTER TABLE inquiries MODIFY display_id VARCHAR(12) NOT NULL;
```

### Step 4: Add Indexes

```sql
CREATE INDEX idx_inquiries_display_id ON inquiries(display_id);
```

### Expected Results

```
Before migration:
  inquiries table: ~500 MB
  Queries: Use UUID only

After migration:
  inquiries table: ~550 MB (+10%)
  Queries: Can use display_id or UUID
  Performance: No change (indexes in place)
  User experience: Significantly improved
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('DisplayIdGenerator', () => {
  it('generates deterministic IDs', () => {
    const uuid = 'fce43de0-339c-4706-a2e2-c9d70260061e';
    expect(DisplayIdGenerator.generate(uuid, 'inquiry')).toBe(
      DisplayIdGenerator.generate(uuid, 'inquiry')
    );
  });

  it('handles UUIDs with or without hyphens', () => {
    const withHyphens = 'fce43de0-339c-4706-a2e2-c9d70260061e';
    const withoutHyphens = 'fce43de0339c4706a2e2c9d70260061e';

    expect(DisplayIdGenerator.generate(withHyphens, 'inquiry')).toBe(
      DisplayIdGenerator.generate(withoutHyphens, 'inquiry')
    );
  });

  it('generates different prefixes for different types', () => {
    const uuid = 'fce43de0-339c-4706-a2e2-c9d70260061e';

    expect(DisplayIdGenerator.generate(uuid, 'inquiry')).toMatch(/^QID-/);
    expect(DisplayIdGenerator.generate(uuid, 'quote')).toMatch(/^QOT-/);
    expect(DisplayIdGenerator.generate(uuid, 'order')).toMatch(/^ORD-/);
  });
});
```

### Integration Tests

```typescript
describe('Inquiry API', () => {
  it('creates inquiry with auto-generated display_id', async () => {
    const response = await request(app)
      .post('/inquiries')
      .send({ title: 'Test', description: 'Test' });

    expect(response.body.displayId).toMatch(/^QID-[A-Z0-9]{6}$/);
  });

  it('allows lookup by display_id', async () => {
    const inquiry = await inquiryService.create({ ... });

    const found = await request(app)
      .get(`/inquiries/${inquiry.displayId}`);

    expect(found.body.id).toBe(inquiry.id);
  });

  it('allows lookup by UUID', async () => {
    const inquiry = await inquiryService.create({ ... });

    const found = await request(app)
      .get(`/inquiries/${inquiry.id}`);

    expect(found.body.displayId).toBe(inquiry.displayId);
  });
});
```

---

## Deployment Checklist

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Generate display_ids for existing records
- [ ] Verify no display_id collisions
- [ ] Update API to return both id and displayId
- [ ] Update frontend to display displayId
- [ ] Add copy-to-clipboard functionality
- [ ] Train customer support
- [ ] Deploy to production during low-traffic window
- [ ] Monitor for 24 hours
- [ ] Update documentation
- [ ] Notify users of new inquiry reference format

---

## Further Reading

### Related Concepts

- Database indexing strategies
- UUID vs sequential ID trade-offs
- API design best practices
- Customer communication patterns
- Distributed system ID generation

### Industry References

- Stripe's Sortable API IDs
- AWS Resource Identifiers
- GitHub's API Design
- Jira's Issue Key System
- Snowflake IDs (Twitter)
