# Lenco API Documentation

This document serves as a reference for the Lenco Financial API integration within the TONSE platform.

## API Configuration
- **Base URL**: `https://api.lenco.co/access/v2`
- **Authorization**: `Bearer {API_KEY}`
- **Accept**: `application/json`
- **Content-Type**: `application/json`

---

## 1. Collections

### GET /collections
Retrieve a list of collection requests.
- **Query Params**: `page`, `from`, `to`, `status`, `type`, `country`
- **Response**: List of collection objects with `status`, `amount`, `reference`, and `type`.

### GET /collections/:id
Retrieve details of a specific collection by UUID.

### GET /collections/status/:reference
Retrieve information about a collection request using the merchant reference.

---

## 2. Mobile Money Collection (Zambia/Malawi)

### POST /collections/mobile-money
Initiates a payment request (STK Push) to a customer's phone.

**Request Payload:**
```json
{
  "amount": number,
  "reference": "unique-ref",
  "phone": "string",
  "operator": "airtel" | "mtn" | "tnm",
  "country": "zm" | "mw",
  "bearer": "merchant" | "customer"
}
```

**Status Flow:**
1. Initial status is usually `pay-offline`.
2. Customer authorizes on their device.
3. Requery the status endpoint or wait for a webhook to get `successful` or `failed`.

---

## 3. Card Collection

### POST /collections/card
**IMPORTANT**: Requires JWE Encryption and PCI DSS compliance.

**Encryption Guide Reference**: [Lenco Encryption Guide](https://lenco-api.readme.io/v2.0/reference/encryption)

**Payload (Before Encryption):**
```json
{
  "reference": "unique-ref",
  "email": "customer@email.com",
  "amount": "1000",
  "currency": "ZMW",
  "bearer": "merchant",
  "customer": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "billing": {
    "streetAddress": "Street Name",
    "city": "City",
    "state": "ST",
    "postalCode": "12345",
    "country": "US"
  },
  "card": {
    "number": "5555 5555 5555 4444",
    "cvv": "838",
    "expiryMonth": "12",
    "expiryYear": "2024"
  },
  "redirectUrl": "https://yourdomain.com/verify"
}
```

**3DS Authorization:**
If `status` is `3ds-auth-required`, the response includes `meta.authorization.redirect`. The user must be redirected to this URL to complete the payment.

---

## 4. Test Credentials
Lenco provides sandbox accounts and cards for testing:
- **Test Guide**: [Test Cards and Accounts](https://lenco-api.readme.io/v2.0/reference/test-cards-and-accounts)
