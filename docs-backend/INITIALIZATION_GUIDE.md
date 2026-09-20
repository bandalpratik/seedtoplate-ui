# Spring Boot Application Initialization - Seed & Plate

## Project Structure Overview

This document outlines the complete Spring Boot application structure that has been initialized for the Seed & Plate farm-to-table D2C platform.

---

## Directory Structure

```
src/main/java/com/farm/seedtoplate/
├── entity/                    # JPA Entity Classes
│   ├── User.java
│   ├── Farm.java
│   ├── CropBatch.java
│   ├── WaitlistReservation.java
│   └── Order.java
├── enums/                     # Business Enums
│   ├── PickupLocation.java
│   ├── Role.java
│   ├── CropStage.java
│   ├── ReservationStatus.java
│   └── PaymentStatus.java
├── repository/               # Spring Data JPA Repositories
│   ├── UserRepository.java
│   ├── FarmRepository.java
│   ├── CropBatchRepository.java
│   ├── WaitlistReservationRepository.java
│   └── OrderRepository.java
├── exception/                # Custom Exceptions
│   ├── InsufficientYieldException.java
│   └── ResourceNotFoundException.java
├── config/                   # Spring Configuration Classes
│   └── JpaConfig.java
└── SeedtoplateApplication.java

src/main/resources/
├── application.yaml          # Spring Boot Configuration
├── db/
│   └── schema.sql           # PostgreSQL DDL Script
└── static/
└── templates/
```

---

## Entities & Database Schema

### 1. User Entity
- **Purpose:** Represents a customer or admin in the system
- **Fields:**
  - `id` - Auto-generated primary key
  - `fullName` - User's full name (required)
  - `phoneNumber` - Unique phone number identifier
  - `defaultPickupLocation` - Enum (PUNE_OFFICE or JUINAGAR_RESIDENCE)
  - `role` - Enum (CUSTOMER or ADMIN)
  - `createdAt` - Auto-managed timestamp

**Repository:** `UserRepository`
- Methods: `findByPhoneNumber()`, `findByRole()`, `existsByPhoneNumber()`

---

### 2. Farm Entity
- **Purpose:** Represents production hubs or partner farms in the network
- **Fields:**
  - `id` - Auto-generated primary key
  - `farmName` - Name of the farm
  - `location` - Farm location (default: "Wai, Maharashtra")
  - `isPrimaryHub` - Boolean indicating primary hub status
  - `createdAt` - Auto-managed timestamp

**Repository:** `FarmRepository`
- Methods: `findByIsPrimaryHub()`, `findByFarmName()`, `existsByFarmName()`

---

### 3. CropBatch Entity
- **Purpose:** Represents a batch of crops at a specific lifecycle stage
- **Fields:**
  - `id` - Auto-generated primary key
  - `farm` - ManyToOne relationship to Farm
  - `cropName` - Type of crop (e.g., "Wheat", "Onion")
  - `seedVariety` - Seed variety (e.g., "Gaavthi")
  - `isChemicalFree` - Boolean for farming practice
  - `currentStage` - Enum (SOWN → GROWING → HARVESTED → STORED_CURING → BATCH_RELEASED → ARCHIVED)
  - `totalYieldKg` - Total yield in kilograms
  - `availableYieldKg` - Available quantity for reservations
  - `procurementPricePerKg` - Procurement/cost price (nullable)
  - `finalRetailPricePerKg` - Retail price set at release (nullable)
  - `sownDate` - Date seeds were sown
  - `harvestDate` - Date crop was harvested
  - `createdAt` - Auto-managed timestamp

**Repository:** `CropBatchRepository`
- Methods: 
  - `findByCurrentStage()` - Find batches by stage
  - `findAllActive()` - Exclude archived batches
  - `findByFarmId()` - Filter by farm
  - `findByCropName()`, `findBySeedVariety()`, `findByIsChemicalFree()`
  - `findByFarmIdAndCurrentStage()` - Combined filter
  - `findByIdAndActive()` - Find non-archived batch by ID

---

### 4. WaitlistReservation Entity
- **Purpose:** Zero-cost customer reservations for crops awaiting release
- **Fields:**
  - `id` - Auto-generated primary key
  - `customer` - ManyToOne relationship to User
  - `cropBatch` - ManyToOne relationship to CropBatch
  - `requestedQuantityKg` - Quantity reserved in kg
  - `pickupLocation` - Enum (PUNE_OFFICE or JUINAGAR_RESIDENCE)
  - `status` - Enum (PENDING_RELEASE → AWAITING_PAYMENT → PAID_READY_FOR_PICKUP → COMPLETED or CANCELLED)
  - `calculatedTotalAmount` - Price calculated at batch release (nullable)
  - `createdAt` - Auto-managed timestamp

**Repository:** `WaitlistReservationRepository`
- Methods:
  - `findByCustomerId()` - Get customer's reservations
  - `findByCropBatchId()` - Get reservations for a batch
  - `findByStatus()` - Filter by status
  - `findPendingReleaseByBatchIdFifo()` - FIFO ordering for allocation
  - `findByCustomerIdAndStatus()` - Combined filter
  - `findAllReadyForPickup()` - For manifest generation
  - `getTotalReservedQuantity()` - Calculate total reserved qty
  - `countPendingReleaseByBatchId()` - Count pending reservations

---

### 5. Order Entity
- **Purpose:** Payment records tied to waitlist reservations
- **Fields:**
  - `id` - Auto-generated primary key
  - `reservation` - OneToOne relationship to WaitlistReservation
  - `paymentTransactionId` - Transaction ID from payment gateway
  - `paymentGateway` - Gateway used (default: "RAZORPAY_UPI")
  - `amountPaid` - Amount paid in currency
  - `paymentStatus` - Enum (INITIATED → SUCCESS or FAILED)
  - `paidAt` - Timestamp of successful payment
  - `pickedUpAt` - Timestamp of order pickup
  - `createdAt` - Auto-managed timestamp

**Repository:** `OrderRepository`
- Methods:
  - `findByPaymentTransactionId()` - Lookup by transaction ID
  - `findByPaymentStatus()` - Filter by payment status
  - `findByReservationId()` - Get order for reservation
  - `findSuccessfulOrdersByCustomerId()` - Customer order history
  - `existsByReservationId()` - Check if order exists
  - `countSuccessfulOrders()` - Total successful orders

---

## Enums

### PickupLocation
```java
PUNE_OFFICE          // Pickup at Pune office
JUINAGAR_RESIDENCE   // Pickup at Juinagar residence
```

### Role
```java
CUSTOMER   // Customer user
ADMIN      // Administrator user
```

### CropStage
```java
SOWN              // Seeds sown in field
GROWING           // Crops growing
HARVESTED         // Harvested from field
STORED_CURING     // In storage/curing phase
BATCH_RELEASED    // Released for customer sale
ARCHIVED          // No longer available
```

### ReservationStatus
```java
PENDING_RELEASE        // Awaiting batch release
AWAITING_PAYMENT       // Batch released, waiting for payment
PAID_READY_FOR_PICKUP  // Payment received, ready for pickup
COMPLETED              // Order fulfilled and picked up
CANCELLED              // Reservation cancelled
```

### PaymentStatus
```java
INITIATED   // Payment order created
SUCCESS     // Payment successfully processed
FAILED      // Payment failed
```

---

## Database Setup Instructions

### Prerequisites
- PostgreSQL 12+ installed and running
- psql CLI tool available

### Step 1: Create Database
```bash
createdb seedtoplate
```

### Step 2: Execute Schema Script
```bash
psql -U postgres -d seedtoplate -f src/main/resources/db/schema.sql
```

Or using psql interactive:
```bash
psql -U postgres
CREATE DATABASE seedtoplate;
\c seedtoplate
\i src/main/resources/db/schema.sql
```

### Step 3: Verify Schema
```sql
\dt seedtoplate.*  -- List all tables
\d seedtoplate.users  -- View table structure
```

---

## Application Configuration (application.yaml)

### Key Settings
- **Database URL:** `jdbc:postgresql://localhost:5432/seedtoplate`
- **Default User:** `postgres` / `postgres`
- **Connection Pool:** HikariCP with max 20 connections
- **Hibernate DDL:** `validate` (does NOT auto-create tables)
- **JPA Logging:** INFO level for SQL execution

### Important Notes
1. **DDL Mode is VALIDATE** - Tables must exist before running the application
2. **Hibernate Batching** - Batch size set to 25 for performance
3. **Connection Pooling** - HikariCP with 20 max connections for scalability
4. **Lazy Loading** - Open-in-view set to false to prevent N+1 queries

---

## Maven Build & Run

### Build
```bash
./mvnw clean package
```

### Run Application
```bash
./mvnw spring-boot:run
```

### Run Tests
```bash
./mvnw test
```

---

## Next Steps (Phase 1 Implementation)

1. **Create Service Layer**
   - `WaitlistReservationService` - Handle reservation logic with yield validation
   - `BatchReleaseService` - Manage batch release and pricing
   - `OrderService` - Process payments and transitions

2. **Create REST Controllers**
   - `CropBatchController` - Feed endpoint
   - `WaitlistController` - Reservation endpoint
   - `AdminController` - Batch management endpoints
   - `PaymentController` - Webhook and payment intent endpoints

3. **Exception Handling**
   - Global exception handler using `@ControllerAdvice`
   - Custom error response DTOs
   - HTTP status code mapping

4. **Testing**
   - Repository integration tests with TestContainers
   - Service layer unit tests
   - Controller integration tests

---

## Development Checklist

- [x] Maven dependencies configured
- [x] JPA entities created with Lombok
- [x] Repositories with custom queries
- [x] Database schema SQL script
- [x] Application configuration
- [ ] Service layer implementation
- [ ] REST controllers
- [ ] Global exception handler
- [ ] Unit & integration tests
- [ ] API documentation (Swagger/OpenAPI)

---

## Team Notes

- **Lombok Annotation Processor:** Configured in Maven compiler plugin
- **PostgreSQL Dialect:** Using `PostgreSQL10Dialect` for Hibernate
- **Indexing Strategy:** All foreign keys and frequently queried columns indexed
- **Concurrency:** Use `@Transactional` on service methods for ACID compliance
- **Fetching:** Use `FetchType.LAZY` to prevent N+1 query problems

---

## Resources

- [Spring Data JPA Documentation](https://spring.io/projects/spring-data-jpa)
- [Lombok Documentation](https://projectlombok.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Hibernate Documentation](https://hibernate.org/orm/documentation/)

