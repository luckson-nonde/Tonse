# JWT Authentication Integration Guide

This guide explains the JWT authentication system connecting the React frontend to the NestJS backend.

## Overview

The authentication system uses:
- **Backend**: NestJS with Passport.js and JWT strategy
- **Frontend**: React Context API + localStorage for token storage
- **Tokens**: Access Token (1 hour) + Refresh Token (7 days)
- **Communication**: Automatic token refresh on expiration

## Architecture

### Backend (NestJS)

**Endpoints:**
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Get new access token
- `POST /api/auth/logout` - Clear refresh token
- `GET /api/auth/me` - Get current user (protected)

**Token Structure:**
```
Access Token Payload:
{
  sub: "user-id",
  email: "user@example.com",
  role: "BUYER",
  iat: 1234567890,
  exp: 1234571490
}

Refresh Token Payload:
{
  sub: "user-id",
  type: "refresh",
  iat: 1234567890,
  exp: 1234608690
}
```

### Frontend (React)

**Files:**
- `src/services/api/client.ts` - HTTP client with JWT handling
- `src/services/auth/authService.ts` - Auth business logic
- `src/AuthContext.tsx` - Auth state management
- `src/hooks/useApi.ts` - Custom hook for API calls
- `src/components/ProtectedRoute.tsx` - Route protection

## Setup

### 1. Environment Variables

Create `.env.local` in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 2. Token Storage

Tokens are stored in localStorage:
- `access_token` - JWT for API requests
- `refresh_token` - JWT for refreshing access token

### 3. Initialization

The `AuthProvider` automatically:
1. Checks for existing valid token on mount
2. Fetches current user from backend
3. Handles expired tokens

## Usage

### Login

```tsx
import { useAuth } from '@/AuthContext';

function LoginPage() {
  const { login, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // User is now authenticated, redirected automatically
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    // Login form...
  );
}
```

### Register

```tsx
const { register } = useAuth();

await register(email, password, name, phone, 'BUYER');
```

### Protected Routes

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Access User Data

```tsx
const { user, isAuthenticated } = useAuth();

if (isAuthenticated) {
  console.log(user.email); // User email
  console.log(user.role);  // User role
}
```

### Logout

```tsx
const { logout } = useAuth();

await logout();
// Tokens cleared, user redirected to login
```

### Making API Calls

Use the custom `useApi` hook:

```tsx
import { useApi } from '@/hooks/useApi';

function UsersList() {
  const { data: users, loading, error, get } = useApi('/users');

  useEffect(() => {
    get();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

Or use the imperative API client:

```tsx
import { apiClient } from '@/services/api/client';

// GET request
const users = await apiClient.get('/users');

// POST request
const newUser = await apiClient.post('/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT request
await apiClient.put(`/users/${id}`, { name: 'Jane' });

// DELETE request
await apiClient.delete(`/users/${id}`);
```

## Token Refresh Flow

The system automatically handles token refresh:

1. **On Each Request**: Check if access token exists and is not expired
2. **If Expired**: Automatically request new tokens using refresh token
3. **On Success**: Store new tokens and retry original request
4. **On Failure**: Clear tokens and redirect to login

This happens transparently - no need for manual handling.

## Error Handling

The API client handles common errors:

```tsx
try {
  await apiClient.get('/protected-resource');
} catch (error) {
  if (error.message.includes('Unauthorized')) {
    // Token invalid, user redirected to login automatically
  } else if (error.message.includes('not found')) {
    // 404 error
  } else {
    // Other error
  }
}
```

## Security Best Practices

1. **Never store sensitive data** in localStorage besides tokens
2. **Always use HTTPS** in production
3. **Set secure cookie flags** if using HTTP-only cookies (future enhancement)
4. **Validate token expiration** before making requests
5. **Clear tokens on logout** (done automatically)

## Backend Configuration

Ensure backend has:

```env
# backend/.env
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRATION=3600s
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRATION=604800s
```

## Testing Authentication

Test the complete flow:

1. **Register**: Create a new account
   ```
   POST /api/auth/register
   {
     "email": "test@example.com",
     "password": "password123",
     "name": "Test User",
     "phone": "+1234567890",
     "role": "BUYER"
   }
   ```

2. **Login**: Get tokens
   ```
   POST /api/auth/login
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```

3. **Access Protected Route**: Use token
   ```
   GET /api/auth/me
   Headers: Authorization: Bearer <access_token>
   ```

4. **Refresh Token**: Get new access token
   ```
   POST /api/auth/refresh
   Headers: Authorization: Bearer <refresh_token>
   ```

## Troubleshooting

### "No matching version found for @nestjs/jwt"
- **Solution**: Update `backend/package.json` to `@nestjs/jwt: ^11.0.0`
- Run `npm install --legacy-peer-deps` in backend folder

### "Cannot GET /api/auth/me"
- **Solution**: Check backend is running on port 3001
- Verify `REACT_APP_API_URL` in `.env.local` points to correct backend

### Tokens not persisting
- **Solution**: Check browser localStorage is not disabled
- Clear browser cache and reload

### Token not refreshing automatically
- **Solution**: Ensure refresh token exists and hasn't expired
- Check browser console for error messages

## Future Enhancements

- [ ] HTTP-only cookies for token storage (more secure than localStorage)
- [ ] Refresh token rotation
- [ ] Multi-device session management
- [ ] Role-based access control (RBAC) refinement
- [ ] Two-factor authentication (2FA)
- [ ] Social login (Google, GitHub, etc.)
