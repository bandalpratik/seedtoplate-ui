# Seed & Plate REST API Contracts (Phase 1)

**Document Version:** 1.0  
**Last Updated:** 2026-09-18  
**API Version:** v1

---

## Overview

This document defines the REST API contracts for Seed & Plate Spring Boot application. All endpoints return JSON and accept JSON payloads. Base URL: `/api/v1`

---

## Authentication & Headers

All requests should include:
- `Content-Type: application/json`
- `Accept: application/json`

**Note:** Authentication/authorization will be implemented in Phase 2 (JWT tokens).

---

## Response Format

### Success Response (2xx)
```json
{
  "status": "SUCCESS",
  "data": { /* entity data */ },
  "message": "Operation completed successfully"
}
```

### Error Response (4xx, 5xx)
```json
{
  "status": "ERROR",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": "Crop batch with ID 123 not found"
  },
  "timestamp": "2026-09-18T10:30:00Z"
}
```

---

## CUSTOMER ENDPOINTS

### 1. Get Crop Feed
Retrieve all active crop batches with current lifecycle status and media.

**Endpoint:** `GET /crops/feedList`

**Query Parameters:**
- `stage` (optional) - Filter by CropStage (SOWN, GROWING, HARVESTED, STORED_CURING, BATCH_RELEASED)
- `isChemicalFree` (optional) - Filter by farming practice (true/false)
- `page` (optional) - Page number (default: 0)
- `size` (optional) - Page size (default: 20)

**Example Request:**
```bash
GET /api/v1/crops/feedList?stage=BATCH_RELEASED&isChemicalFree=true&page=0&size=10
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "content": [
      {
        "id": 1,
        "farmId": 1,
        "cropName": "Onion",
        "seedVariety": "Gaavthi",
        "isChemicalFree": true,
        "currentStage": "BATCH_RELEASED",
        "totalYieldKg": 1000.00,
        "availableYieldKg": 500.00,
        "procurementPricePerKg": null,
        "finalRetailPricePerKg": 150.00,
        "sownDate": "2026-04-15",
        "harvestDate": "2026-08-20",
        "createdAt": "2026-05-01T10:00:00Z"
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "currentPage": 0,
    "pageSize": 10
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Database error

---

### 2. Get Crop Timeline
Retrieve detailed timeline events for a specific crop batch.

**Endpoint:** `GET /crops/{batchId}/timeline`

**Path Parameters:**
- `batchId` (required) - The crop batch ID

**Example Request:**
```bash
GET /api/v1/crops/1/timeline
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "batchId": 1,
    "cropName": "Onion",
    "seedVariety": "Gaavthi",
    "currentStage": "BATCH_RELEASED",
    "timeline": [
      {
        "id": 1,
        "stage": "SOWN",
        "title": "Seeds sown at Wai farm",
        "description": "Premium Gaavthi variety onion seeds sown in 100 acre field",
        "mediaUrl": "https://s3.amazonaws.com/seedtoplate/onion-sown-001.jpg",
        "eventDate": "2026-04-15",
        "createdAt": "2026-04-15T08:00:00Z"
      },
      {
        "id": 2,
        "stage": "GROWING",
        "title": "90 days growth milestone",
        "description": "Plants are 25cm tall, healthy green foliage",
        "mediaUrl": "https://s3.amazonaws.com/seedtoplate/onion-growing-001.jpg",
        "eventDate": "2026-07-14",
        "createdAt": "2026-07-14T10:30:00Z"
      },
      {
        "id": 3,
        "stage": "HARVESTED",
        "title": "Harvest completed",
        "description": "1000 kg onions harvested, 98% quality grade",
        "mediaUrl": "https://s3.amazonaws.com/seedtoplate/onion-harvest-001.jpg",
        "eventDate": "2026-08-20",
        "createdAt": "2026-08-20T14:00:00Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found` - Batch not found or archived
- `500 Internal Server Error` - Database error

---

### 3. Create Waitlist Reservation
Submit a zero-cost reservation for a crop batch.

**Endpoint:** `POST /waitlist/reserve`

**Request Body:**
```json
{
  "customerId": 1,
  "batchId": 1,
  "quantityKg": 5.00,
  "pickupLocation": "PUNE_OFFICE"
}
```

**Response (201 Created):**
```json
{
  "status": "SUCCESS",
  "data": {
    "id": 10,
    "customerId": 1,
    "batchId": 1,
    "requestedQuantityKg": 5.00,
    "pickupLocation": "PUNE_OFFICE",
    "status": "PENDING_RELEASE",
    "calculatedTotalAmount": null,
    "createdAt": "2026-09-18T10:30:00Z"
  },
  "message": "Reservation created successfully. You are #42 in the waitlist."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid quantity or missing fields
  ```json
  {
    "status": "ERROR",
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": "Quantity must be greater than 0"
    }
  }
  ```
- `404 Not Found` - User or batch not found
- `409 Conflict` - Insufficient yield available
  ```json
  {
    "status": "ERROR",
    "error": {
      "code": "INSUFFICIENT_YIELD",
      "message": "Insufficient yield",
      "details": "Requested: 100.00 kg, Available: 50.00 kg"
    }
  }
  ```

---

### 4. Get Customer Reservations
Retrieve all reservations for the authenticated customer.

**Endpoint:** `GET /reservations/user/{userId}`

**Path Parameters:**
- `userId` (required) - The customer's user ID

**Query Parameters:**
- `status` (optional) - Filter by ReservationStatus
- `sortBy` (optional) - Sort field (createdAt, requestedQuantityKg, status)

**Example Request:**
```bash
GET /api/v1/reservations/user/1?status=PENDING_RELEASE&sortBy=createdAt
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": 10,
      "cropBatch": {
        "id": 1,
        "cropName": "Onion",
        "seedVariety": "Gaavthi",
        "currentStage": "BATCH_RELEASED",
        "finalRetailPricePerKg": 150.00
      },
      "requestedQuantityKg": 5.00,
      "pickupLocation": "PUNE_OFFICE",
      "status": "PENDING_RELEASE",
      "calculatedTotalAmount": null,
      "createdAt": "2026-09-18T10:30:00Z"
    },
    {
      "id": 11,
      "cropBatch": {
        "id": 2,
        "cropName": "Wheat",
        "seedVariety": "Heritage",
        "currentStage": "GROWING",
        "finalRetailPricePerKg": null
      },
      "requestedQuantityKg": 10.00,
      "pickupLocation": "PUNE_OFFICE",
      "status": "PENDING_RELEASE",
      "calculatedTotalAmount": null,
      "createdAt": "2026-09-17T14:20:00Z"
    }
  ]
}
```

---

### 5. Create Payment Intent
Generate a UPI payment link for an awaiting payment reservation.

**Endpoint:** `POST /payments/create-intent`

**Request Body:**
```json
{
  "reservationId": 10
}
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "orderId": 5,
    "paymentIntentId": "order_SGNz2P_Yy3Q7",
    "amount": 750.00,
    "currency": "INR",
    "upiLink": "upi://pay?pa=business@razorpay&pn=SeedToPlate&am=750.00&tn=Order%20%235&tr=order_SGNz2P_Yy3Q7",
    "expiresAt": "2026-09-20T10:30:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Reservation or order not found
- `409 Conflict` - Reservation not in AWAITING_PAYMENT status

---

### 6. Payment Webhook
Webhook endpoint for payment gateway to confirm successful payment.

**Endpoint:** `POST /payments/webhook`

**Request Headers:**
- `X-Razorpay-Signature: <signature>` (for security verification)

**Request Body:**
```json
{
  "event": "payment.authorized",
  "payload": {
    "order": {
      "entity": {
        "id": "order_SGNz2P_Yy3Q7",
        "amount": 75000,
        "receipt": "10",
        "status": "created"
      }
    },
    "payment": {
      "entity": {
        "id": "pay_CCQQ2eSJy0Q1rO",
        "order_id": "order_SGNz2P_Yy3Q7",
        "amount": 75000,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "message": "Webhook processed successfully"
}
```

**Processing Logic:**
1. Verify webhook signature
2. Extract `paymentId` and `orderId` from payload
3. Verify `payment.status == 'captured'`
4. Update Order: `paymentStatus = SUCCESS`, `paymentTransactionId = paymentId`, `paidAt = NOW()`
5. Transition WaitlistReservation: `status = PAID_READY_FOR_PICKUP`
6. Queue WhatsApp notification (Phase 2)

---

## ADMIN ENDPOINTS

### 1. Create Crop Batch
Create a new crop batch with initial details.

**Endpoint:** `POST /admin/batches`

**Request Body:**
```json
{
  "farmId": 1,
  "cropName": "Wheat",
  "seedVariety": "Heritage",
  "isChemicalFree": true,
  "currentStage": "SOWN",
  "totalYieldKg": 500.00,
  "sownDate": "2026-09-01"
}
```

**Response (201 Created):**
```json
{
  "status": "SUCCESS",
  "data": {
    "id": 3,
    "farmId": 1,
    "cropName": "Wheat",
    "seedVariety": "Heritage",
    "isChemicalFree": true,
    "currentStage": "SOWN",
    "totalYieldKg": 500.00,
    "availableYieldKg": 500.00,
    "createdAt": "2026-09-18T10:30:00Z"
  }
}
```

---

### 2. Add Timeline Event
Post a media/stage update to a crop batch.

**Endpoint:** `POST /admin/batches/{batchId}/timeline-event`

**Path Parameters:**
- `batchId` (required) - The crop batch ID

**Request Body:**
```json
{
  "stage": "GROWING",
  "title": "90 days growth milestone",
  "description": "Plants are 25cm tall, healthy green foliage",
  "mediaUrl": "https://s3.amazonaws.com/seedtoplate/wheat-growing-001.jpg",
  "eventDate": "2026-12-18"
}
```

**Response (201 Created):**
```json
{
  "status": "SUCCESS",
  "data": {
    "id": 2,
    "batchId": 3,
    "stage": "GROWING",
    "title": "90 days growth milestone",
    "description": "Plants are 25cm tall, healthy green foliage",
    "mediaUrl": "https://s3.amazonaws.com/seedtoplate/wheat-growing-001.jpg",
    "eventDate": "2026-12-18",
    "createdAt": "2026-09-18T10:30:00Z"
  }
}
```

---

### 3. Release Batch Inventory
Release partial batch inventory and trigger payment requests for waitlisted customers.

**Endpoint:** `POST /admin/batches/{batchId}/release`

**Path Parameters:**
- `batchId` (required) - The crop batch ID

**Request Body:**
```json
{
  "releaseQuantityKg": 100.00,
  "finalRetailPricePerKg": 150.00
}
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "batchId": 1,
    "releaseQuantityKg": 100.00,
    "finalRetailPricePerKg": 150.00,
    "reservationsTransitioned": 20,
    "totalAmountCharged": 3000.00,
    "newBatchStage": "BATCH_RELEASED",
    "remainingAvailableYieldKg": 400.00,
    "processingDetails": [
      {
        "reservationId": 10,
        "customerId": 1,
        "quantityAllocated": 5.00,
        "totalAmount": 750.00,
        "paymentIntentCreated": true,
        "status": "AWAITING_PAYMENT"
      }
    ]
  }
}
```

**Business Logic (Rule 2 Implementation):**
1. Fetch batch and validate it exists and not archived
2. Update batch: `currentStage = BATCH_RELEASED`, `finalRetailPricePerKg = provided price`
3. Query FIFO: Get all PENDING_RELEASE reservations, ordered by createdAt ASC
4. For each reservation up to `releaseQuantityKg`:
   - Calculate: `calculatedTotalAmount = requestedQuantityKg * finalRetailPricePerKg`
   - Update reservation: `status = AWAITING_PAYMENT`, set `calculatedTotalAmount`
   - Create Order record with `INITIATED` status
   - Queue payment intent creation (Phase 2)
   - Queue WhatsApp notification (Phase 2)
5. Return summary with all transitioned reservations

**Error Responses:**
- `400 Bad Request` - Invalid quantity or price
- `404 Not Found` - Batch not found
- `409 Conflict` - Batch already released or archived

---

### 4. Get Logistics Manifest
Get aggregated packing and drop-off manifest grouped by pickup location.

**Endpoint:** `GET /admin/logistics/manifest`

**Query Parameters:**
- `pickupLocation` (optional) - Filter by PUNE_OFFICE or JUINAGAR_RESIDENCE
- `format` (optional) - Response format (json or csv)

**Example Request:**
```bash
GET /api/v1/admin/logistics/manifest?format=json
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "generatedAt": "2026-09-18T10:30:00Z",
    "totalOrdersReady": 45,
    "totalWeightKg": 500.00,
    "locations": [
      {
        "location": "PUNE_OFFICE",
        "totalOrdersCount": 30,
        "totalWeightKg": 350.00,
        "crops": [
          {
            "cropName": "Onion",
            "seedVariety": "Gaavthi",
            "totalWeightKg": 200.00,
            "orders": [
              {
                "orderId": 5,
                "reservationId": 10,
                "customerId": 1,
                "customerName": "John Doe",
                "customerPhone": "9876543210",
                "quantityKg": 5.00,
                "totalAmount": 750.00,
                "status": "PAID_READY_FOR_PICKUP"
              }
            ]
          },
          {
            "cropName": "Wheat",
            "seedVariety": "Heritage",
            "totalWeightKg": 150.00,
            "orders": [
              {
                "orderId": 6,
                "reservationId": 11,
                "customerId": 2,
                "customerName": "Jane Smith",
                "customerPhone": "9123456789",
                "quantityKg": 10.00,
                "totalAmount": 1500.00,
                "status": "PAID_READY_FOR_PICKUP"
              }
            ]
          }
        ]
      },
      {
        "location": "JUINAGAR_RESIDENCE",
        "totalOrdersCount": 15,
        "totalWeightKg": 150.00,
        "crops": [
          {
            "cropName": "Onion",
            "seedVariety": "Gaavthi",
            "totalWeightKg": 150.00,
            "orders": [
              {
                "orderId": 7,
                "reservationId": 12,
                "customerId": 3,
                "customerName": "Alex Kumar",
                "customerPhone": "9198765432",
                "quantityKg": 3.00,
                "totalAmount": 450.00,
                "status": "PAID_READY_FOR_PICKUP"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Business Logic (Rule 3 Implementation):**
1. Query WaitlistReservation where `status = PAID_READY_FOR_PICKUP`
2. Group by `pickupLocation` then by `cropBatch.cropName`
3. Aggregate: SUM(requestedQuantityKg) per group
4. Include order details for packing checklist
5. Optionally export as CSV

---

### 5. Mark Order as Completed
Mark an order as physically picked up.

**Endpoint:** `PATCH /admin/reservations/{reservationId}/complete`

**Path Parameters:**
- `reservationId` (required) - The waitlist reservation ID

**Request Body:**
```json
{
  "notes": "Picked up by customer at PUNE_OFFICE desk"
}
```

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "data": {
    "reservationId": 10,
    "status": "COMPLETED",
    "orderId": 5,
    "pickedUpAt": "2026-09-18T11:00:00Z",
    "notes": "Picked up by customer at PUNE_OFFICE desk"
  }
}
```

**Processing Logic:**
1. Fetch reservation and verify it exists
2. Verify reservation `status == PAID_READY_FOR_PICKUP`
3. Fetch associated Order
4. Update Order: `pickedUpAt = NOW()`
5. Update Reservation: `status = COMPLETED`
6. Queue completion notification (Phase 2)

---

## Error Codes & HTTP Status Mapping

| HTTP Status | Code | Meaning |
|---|---|---|
| 200 | OK | Request successful |
| 201 | CREATED | Resource created successfully |
| 400 | BAD_REQUEST | Invalid input or validation error |
| 404 | RESOURCE_NOT_FOUND | Requested resource not found |
| 409 | CONFLICT | Business logic conflict (e.g., insufficient yield) |
| 422 | UNPROCESSABLE_ENTITY | Semantic error |
| 500 | INTERNAL_SERVER_ERROR | Server-side error |

---

## Rate Limiting & Pagination

**Pagination (for list endpoints):**
- Default page size: 20
- Max page size: 100
- Sort orders: ASC or DESC

**Example:**
```
GET /api/v1/crops/feedList?page=0&size=10&sort=createdAt,desc
```

---

## Future Enhancements (Phase 2+)

- [ ] JWT Authentication & Authorization
- [ ] Request validation with Spring Validation
- [ ] Batch release scheduling
- [ ] WhatsApp Business API integration
- [ ] Payment timeout auto-cancellation (Quartz scheduler)
- [ ] Elasticsearch integration for search
- [ ] API versioning (v2, v3, etc.)
- [ ] Request/response encryption
- [ ] Rate limiting per user
- [ ] API documentation (Swagger/OpenAPI)

---

## Implementation Order

1. Create REST Controllers with endpoints listed above
2. Add request/response DTOs if needed
3. Implement global exception handler
4. Add Swagger/OpenAPI documentation
5. Write integration tests for each endpoint
6. Deploy to staging environment
7. Load testing and optimization

