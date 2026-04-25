# API Testing Guide

## 🧪 Complete API Testing Examples

Use these examples to test your full-stack application with curl, Postman, or any HTTP client.

## 1. Authentication Flow

### Register New User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@tonse.local",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "BUYER"
  }'

# Response (201 Created)
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "id": "a1b2c3d4-e5f6-47ab-8cd9-ef0123456789",
    "email": "buyer@tonse.local",
    "name": "John Doe",
    "role": "BUYER"
  }
}
```

### Login & Get Tokens
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@tonse.local",
    "password": "SecurePass123!"
  }'

# Response (200 OK)
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNCIsImVt...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNCIs...",
    "user": {
      "id": "a1b2c3d4-e5f6-47ab-8cd9-ef0123456789",
      "email": "buyer@tonse.local",
      "name": "John Doe",
      "role": "BUYER"
    }
  }
}
```

### Save Tokens for Later Use
```bash
# Store these in your HTTP client or shell
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export USER_ID="a1b2c3d4-e5f6-47ab-8cd9-ef0123456789"
```

### Get Current User (Protected)
```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Response (200 OK)
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "a1b2c3d4-e5f6-47ab-8cd9-ef0123456789",
    "email": "buyer@tonse.local",
    "role": "BUYER"
  }
}
```

### Refresh Access Token (After Expiration)
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Authorization: Bearer $REFRESH_TOKEN"

# Response (200 OK)
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  # NEW token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # NEW token
  }
}

# Update your saved tokens
export ACCESS_TOKEN="new_token_here"
export REFRESH_TOKEN="new_refresh_token_here"
```

### Logout (Invalidate Tokens)
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Response (200 OK)
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Logout successful"
  }
}

# Tokens are now invalid
```

## 2. Error Handling Examples

### Invalid Credentials
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@tonse.local",
    "password": "WrongPassword"
  }'

# Response (401 Unauthorized)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "detail": "Invalid credentials",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

### Expired or Invalid Token
```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer invalid_token_here"

# Response (401 Unauthorized)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "detail": "Invalid token",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

### Missing Bearer Token
```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: invalid_format"

# Response (401 Unauthorized)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "detail": "Invalid token format",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

### Validation Error
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123",  # Too short
    "name": "",  # Empty
    "phone": "123"  # Too short
  }'

# Response (400 Bad Request)
{
  "statusCode": 400,
  "message": "Validation failed",
  "detail": "email must be an email, password must be at least 8 characters...",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

### Duplicate Email
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@tonse.local",  # Already registered
    "password": "SecurePass123!",
    "name": "Another User",
    "phone": "+9876543210",
    "role": "SELLER"
  }'

# Response (409 Conflict)
{
  "statusCode": 409,
  "message": "Conflict",
  "detail": "Email already in use",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

## 3. Postman Collection Template

Save as `tonse.postman_collection.json`:

```json
{
  "info": {
    "name": "TONSE Marketplace API",
    "version": "1.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@tonse.local\",\"password\":\"Pass123!\",\"name\":\"Test\",\"phone\":\"+1234567890\",\"role\":\"BUYER\"}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@tonse.local\",\"password\":\"Pass123!\"}"
        }
      }
    },
    {
      "name": "Get Me",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/auth/me"
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/refresh"
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/logout"
      }
    }
  ]
}
```

**Import in Postman:**
1. Click "Import" → "Raw text"
2. Paste above JSON
3. Set variables:
   - `base_url`: `http://localhost:3001`
   - `access_token`: (copy from login response)

## 4. Test Scenarios

### Scenario 1: New User Registration Flow
```bash
# 1. Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@tonse.local","password":"Alice123!","name":"Alice","phone":"+1111111111","role":"BUYER"}'

# 2. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@tonse.local","password":"Alice123!"}'

# 3. Use access token
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <access_token_from_step_2>"

# Expected: 200 OK with user data
```

### Scenario 2: Multiple Users
```bash
# User 1: Buyer
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer1@tonse.local","password":"Pass123!","name":"Buyer 1","phone":"+2222222222","role":"BUYER"}'

# User 2: Seller
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seller1@tonse.local","password":"Pass123!","name":"Seller 1","phone":"+3333333333","role":"SELLER"}'

# User 3: Service Provider
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"provider1@tonse.local","password":"Pass123!","name":"Provider 1","phone":"+4444444444","role":"SERVICE_PROVIDER"}'
```

### Scenario 3: Token Expiration & Refresh
```bash
# 1. Login (get tokens with 1-hour expiration)
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@tonse.local","password":"SecurePass123!"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

# 2. Use access token (works immediately)
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# Expected: 200 OK

# 3. After 1 hour, refresh to get new tokens
curl -X POST http://localhost:3001/auth/refresh \
  -H "Authorization: Bearer $REFRESH_TOKEN"
# Expected: New accessToken & refreshToken

# 4. Use new access token
# Continue until refresh token expires (7 days) → user must login again
```

## 5. Load Testing

### Simple Load Test (100 requests)
```bash
#!/bin/bash
for i in {1..100}; do
  curl -X POST http://localhost:3001/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@tonse.local\",\"password\":\"Pass123!\",\"name\":\"User $i\",\"phone\":\"+12222222$i\",\"role\":\"BUYER\"}" &
done
wait

echo "100 registrations completed"
```

### Performance Monitoring
```bash
# Check database size
docker exec tonse_postgres psql -U tonse_user -d tonse_db -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) \
   FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check query performance
docker exec tonse_postgres psql -U tonse_user -d tonse_db -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

## 6. Database Verification

### Connect to Database
```bash
docker exec -it tonse_postgres psql -U tonse_user -d tonse_db

# Inside psql:
\dt                           # List all tables
SELECT COUNT(*) FROM users;   # Count users
SELECT COUNT(*) FROM inquiries;  # Count inquiries
\q                            # Exit
```

### Verify Encryption
```sql
-- Check encrypted fields
SELECT id, email, nrc FROM users LIMIT 1;

-- NRC and refreshToken should be encrypted (unreadable hex)
-- Other fields should be readable
```

## 7. Common Test Cases

| Test | Command | Expected |
|------|---------|----------|
| Valid login | `curl -X POST /auth/login` | 200 + tokens |
| Invalid password | `curl -X POST /auth/login` (wrong pwd) | 401 Unauthorized |
| Missing email | `curl -X POST /auth/register` (no email) | 400 Invalid email |
| Duplicate email | `curl -X POST /auth/register` (existing) | 409 Conflict |
| Expired token | `curl /auth/me` (old token) | 401 Unauthorized |
| No token | `curl /auth/me` (no header) | 401 Unauthorized |
| Invalid format | `curl /auth/me` (malformed JWT) | 401 Unauthorized |

## ✅ Testing Checklist

- [ ] Can register new user
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong password
- [ ] Cannot register duplicate email
- [ ] Can use access token in protected routes
- [ ] Cannot use expired token
- [ ] Can refresh token before expiration
- [ ] Tokens invalid after logout
- [ ] Error messages are clear & helpful
- [ ] Response format is consistent

---

**Happy Testing! 🧪**
