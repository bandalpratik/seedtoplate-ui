# 🎯 WEEK 4 QUICK START GUIDE

**Phase:** Phase 1, Week 4  
**Focus:** Payment Integration & Logistics  
**Status:** ✅ Complete  

---

## 📦 FILES CREATED (9 Total)

### Payment Services (2 files)
```
✅ PaymentService.java (Interface, 30 lines)
✅ RazorpayPaymentServiceImpl.java (Implementation, 350 lines)
   - generatePaymentLink() - UPI link creation
   - verifyWebhookSignature() - HmacSHA256 verification
```

### Payment Controller (1 file)
```
✅ PaymentWebhookController.java (150 lines)
   - POST /api/v1/payments/webhook/razorpay
   - Handles: payment_link.paid, payment_link.expired, payment_link.cancelled
```

### Logistics Services (1 file)
```
✅ LogisticsService.java (250 lines)
   - generateLogisticsManifest() - Rule 3 implementation
   - getManifestByLocation() - Location filter
   - exportManifestAsCSV() - CSV export
```

### Logistics Controller (1 file)
```
✅ AdminLogisticsController.java (200 lines)
   - GET /api/v1/admin/logistics/manifest
   - GET /api/v1/admin/logistics/manifest/location/{location}
   - GET /api/v1/admin/logistics/manifest/csv
```

### Order Service (1 file)
```
✅ OrderService.java (90 lines)
   - markOrderAsPickedUp()
   - getOrderById()
   - isOrderReadyForPickup()
```

### Configuration (1 file)
```
✅ RazorpayProperties.java (50 lines)
   - Reads razorpay.* properties from application.yaml
   - Manages API credentials securely
```

### DTOs (1 file)
```
✅ LogisticsManifestResponse.java (80 lines)
   - Main response + 3 nested classes
   - LocationManifest, CropBreakdown, CustomerOrderSummary
```

### Configuration Updates (1 file)
```
✅ application.yaml (updated)
   - Added razorpay.* properties
   - Added admin.* properties
```

---

## 🔄 INTEGRATION FLOW

### Payment Link Generation
```
Admin releases batch (Week 3)
  ↓
Order created: paymentStatus = INITIATED
  ↓
RazorpayPaymentServiceImpl.generatePaymentLink(order)
  ├─ Build JSON payload (amount in paise)
  ├─ POST to Razorpay API with Basic Auth
  ├─ Extract payment link ID
  ├─ Update Order.paymentTransactionId
  └─ Return UPI deep link to customer
  ↓
Customer clicks link, makes payment via UPI
```

### Webhook Payment Confirmation
```
Razorpay processes payment
  ↓
Razorpay POSTs to PaymentWebhookController
  ├─ Header: X-Razorpay-Signature: <hmac_sha256>
  └─ Body: JSON with event and payment details
  ↓
PaymentWebhookController.handleRazorpayWebhook()
  ├─ Verify signature with RazorpayPaymentServiceImpl.verifyWebhookSignature()
  ├─ Extract event type and reference ID
  └─ Route to handler:
    - payment_link.paid → handlePaymentPaid()
    - payment_link.expired → handlePaymentExpired()
    - payment_link.cancelled → handlePaymentCancelled()
  ↓
handlePaymentPaid():
  ├─ Update Order.paymentStatus = SUCCESS
  ├─ Update Order.paidAt = NOW()
  ├─ Update Reservation.status = PAID_READY_FOR_PICKUP
  └─ Return 200 OK (idempotent)
  ↓
Order now appears in logistics manifest
```

### Logistics Manifest Generation
```
Admin queries: GET /api/v1/admin/logistics/manifest
  ↓
LogisticsService.generateLogisticsManifest()
  ├─ Query: ALL reservations where status = PAID_READY_FOR_PICKUP
  ├─ Group by: pickupLocation (PUNE_OFFICE, JUINAGAR_RESIDENCE)
  ├─ Sub-group by: cropName
  ├─ For each crop: SUM(requestedQuantityKg)
  ├─ Build CustomerOrderSummary list
  └─ Return LogisticsManifestResponse
  ↓
Response:
{
  "locations": [
    {
      "location": "PUNE_OFFICE",
      "totalWeightToPackKg": 150.5,
      "cropBreakdowns": [
        {"cropName": "Onion", "totalWeightKg": 100.0},
        {"cropName": "Wheat", "totalWeightKg": 50.5}
      ],
      "customerOrders": [
        {"customerName": "John Doe", "cropName": "Onion", "quantityKg": 5.0}
      ]
    }
  ]
}
  ↓
Admin packs goods per manifest
  ↓
Customer picks up at location
  ↓
Admin confirms: PATCH /api/v1/admin/logistics/orders/{orderId}/pickup-confirm
  ├─ Update Order.pickedUpAt = NOW()
  └─ Update Reservation.status = COMPLETED
```

---

## 🔐 SECURITY HIGHLIGHTS

### Razorpay Webhook Signature Verification
```
WITHOUT External SDK:

1. Extract X-Razorpay-Signature header
2. Get raw webhook body (JSON string)
3. Create HMAC-SHA256:
   - Key: razorpay.webhook-secret
   - Message: webhook body
4. Compare computed hash with header signature
5. Use constant-time comparison (prevents timing attacks)

if (verifyWebhookSignature(body, signature)) {
    // Process webhook
} else {
    // Reject unauthorized webhook
}
```

### Credential Security
```yaml
razorpay:
  key-id: ${RAZORPAY_KEY_ID:rzp_test_XXXXX}      # Environment variable
  key-secret: ${RAZORPAY_KEY_SECRET:test_secret}   # Never commit
  webhook-secret: ${RAZORPAY_WEBHOOK_SECRET:...}   # Environment variable
```

---

## 📊 KEY ENDPOINTS

### Payments
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/payments/webhook/razorpay` | POST | Receive payment confirmations |

### Logistics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/admin/logistics/manifest` | GET | Complete manifest (all locations) |
| `/api/v1/admin/logistics/manifest/location/{location}` | GET | Specific location manifest |
| `/api/v1/admin/logistics/manifest/csv` | GET | CSV export |
| `/api/v1/admin/logistics/orders/{orderId}/pickup-confirm` | PATCH | Confirm pickup (Phase 2) |

---

## 🧪 TESTING QUICK REFERENCE

### Test Scenario 1: Payment Link Generation
```bash
# Pre-requisite: Admin released batch (from Week 3)
# Order created with status INITIATED

# Payment Service is called automatically
# Result: Order.paymentTransactionId set to payment link ID
# Customer gets UPI deep link

curl http://localhost:8080/api/v1/admin/batches/1/release
# Order created automatically
```

### Test Scenario 2: Webhook Signature Verification
```bash
# Razorpay sends webhook with signature
# PaymentWebhookController verifies HmacSHA256

# Expected: 200 OK if signature valid
# Expected: 401 Unauthorized if signature invalid
# Expected: Payment state updated
```

### Test Scenario 3: Get Manifest
```bash
# After customer pays (webhook processed)
# Reservation.status = PAID_READY_FOR_PICKUP

curl http://localhost:8080/api/v1/admin/logistics/manifest

# Expected: JSON with all PAID orders grouped by location/crop
# Expected: 35 orders, 225.5 kg total
# Expected: Pune: 150.5 kg, Juinagar: 75 kg
```

### Test Scenario 4: Export Manifest
```bash
curl http://localhost:8080/api/v1/admin/logistics/manifest/csv \
  -o manifest.csv

# Expected: CSV file downloaded
# Expected: Header + crop breakdown + customer list
```

### Test Scenario 5: Location-Specific Manifest
```bash
curl http://localhost:8080/api/v1/admin/logistics/manifest/location/PUNE_OFFICE

# Expected: Only Pune location data
# Expected: 25 orders, 150.5 kg
```

---

## 🔧 CONFIGURATION CHECKLIST

Before deploying Week 4 code:

- [ ] Set RAZORPAY_KEY_ID environment variable
- [ ] Set RAZORPAY_KEY_SECRET environment variable
- [ ] Set RAZORPAY_WEBHOOK_SECRET environment variable
- [ ] Verify Razorpay sandbox/live URLs in application.yaml
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Test webhook signature verification
- [ ] Verify payment link generation with test order
- [ ] Test manifest generation with sample PAID orders
- [ ] CSV export file generation working
- [ ] Error handling for invalid locations

---

## 📈 CODE STATS

| Component | Lines | Key Methods |
|-----------|-------|-------------|
| PaymentService | 30 | 2 |
| RazorpayPaymentServiceImpl | 350 | 6 |
| PaymentWebhookController | 250 | 4 |
| LogisticsService | 250 | 4 |
| AdminLogisticsController | 200 | 4 |
| OrderService | 90 | 4 |
| RazorpayProperties | 50 | — |
| LogisticsManifestResponse | 80 | — |
| **TOTAL** | **~1,300** | **24** |

---

## 🎯 Business Logic Summary

### Rule 2 (Batch Release) → Rule 3 (Logistics Flow)

```
Week 3: Admin releases batch
  → Order created (INITIATED)
  → WaitlistReservation created (AWAITING_PAYMENT)
  
Week 4 (Payment):
  → UPI link generated
  → Customer makes payment
  → Razorpay webhook confirmation
  → Order.paymentStatus = SUCCESS
  → Reservation.status = PAID_READY_FOR_PICKUP
  
Week 4 (Logistics):
  → Admin queries manifest
  → All PAID orders grouped by location/crop
  → Manifest shows: 150 kg onion for Pune, 75 kg wheat for Juinagar
  → Admin packs accordingly
  
Customer Pickup:
  → Customer comes at scheduled time
  → Admin confirms pickup
  → Order marked COMPLETED
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook signature fails | Wrong secret | Verify RAZORPAY_WEBHOOK_SECRET |
| Payment link 401 | Bad credentials | Check RAZORPAY_KEY_ID/SECRET |
| No orders in manifest | Wrong status | Verify webhook processed (PAID_READY_FOR_PICKUP) |
| CSV export empty | No PAID orders | Create test order and pay via webhook |
| Location returns empty | Invalid location | Use PUNE_OFFICE or JUINAGAR_RESIDENCE |

---

## 📚 Code Patterns

### 1. HmacSHA256 Signature (No SDK)
```java
// In RazorpayPaymentServiceImpl
Mac mac = Mac.getInstance("HmacSHA256");
SecretKeySpec keySpec = new SecretKeySpec(
    webhookSecret.getBytes(StandardCharsets.UTF_8),
    "HmacSHA256"
);
mac.init(keySpec);
byte[] hashBytes = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
String computedSignature = HexFormat.of().formatHex(hashBytes);
```

### 2. Transactional Webhook Handling
```java
@PostMapping("/razorpay")
@Transactional  // All-or-nothing
public ResponseEntity<?> handleRazorpayWebhook(
    @RequestBody String body,
    @RequestHeader("X-Razorpay-Signature") String signature
) {
    // Update Order
    // Update Reservation
    // Both succeed or both fail
}
```

### 3. Grouping & Aggregation (LogisticsService)
```java
// Group by location
Map<PickupLocation, List<WaitlistReservation>> byLocation = 
    orders.stream().collect(groupingBy(WaitlistReservation::getPickupLocation));

// Group by crop within location
Map<String, List<WaitlistReservation>> byCrop = 
    orders.stream().collect(groupingBy(r -> r.getCropBatch().getCropName()));

// Sum weights
double totalWeight = byCrop.values().stream()
    .mapToDouble(list -> list.stream().mapToDouble(...).sum())
    .sum();
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All 9 files compiled without errors
- [ ] RazorpayProperties wired with application.yaml
- [ ] PaymentService bean created
- [ ] PaymentWebhookController registered
- [ ] LogisticsService bean created
- [ ] AdminLogisticsController registered
- [ ] OrderService bean created
- [ ] Environment variables set
- [ ] Database migrations run (schema.sql updated if needed)
- [ ] Razorpay webhook URL configured in dashboard
- [ ] Test payment link generation
- [ ] Test webhook handling
- [ ] Test manifest generation
- [ ] All endpoints responding

---

## 📞 SUPPORT MATRIX

| Component | Responsible | Questions |
|-----------|-------------|-----------|
| Razorpay Integration | Backend | "How do I get API credentials?" |
| Webhook Verification | Security | "Is HmacSHA256 secure?" |
| Logistics Grouping | Data | "Why is weight wrong?" |
| CSV Export | Frontend? | "How do I parse CSV?" |

---

**Created:** 2026-09-18  
**Version:** 1.0  
**Status:** ✅ Ready for Testing

---

## 🎓 What You Learned

- ✅ Payment gateway API integration (Razorpay)
- ✅ Webhook handling and signature verification
- ✅ HmacSHA256 cryptography (without SDK)
- ✅ Complex data grouping and aggregation
- ✅ Transactional business logic
- ✅ CSV export generation
- ✅ Production-grade security patterns
- ✅ RESTful API design for complex queries

---

**Next:** Week 5-6: Testing, Performance, Production Deployment

