# Quick Reference Card - Seed & Plate Architecture

**Laminated Quick Reference for Developers**

---

## 🏗️ PROJECT STRUCTURE AT A GLANCE

```
com.farm.seedtoplate/
├── entity/              → 5 JPA entities (User, Farm, CropBatch, WaitlistReservation, Order)
├── enums/               → 5 state enums (PickupLocation, Role, CropStage, ReservationStatus, PaymentStatus)
├── repository/          → 5 Spring Data repositories with custom queries
├── service/             → Business logic (WaitlistReservationService template)
├── exception/           → Custom exceptions (InsufficientYieldException, ResourceNotFoundException)
├── config/              → Spring configuration (JpaConfig)
└── SeedtoplateApplication.java → Main entry point
```

---

## 📊 CORE ENTITIES (ONE-LINER)

| Entity | Primary Purpose | Key Relationship |
|--------|-----------------|------------------|
| **User** | Customer/Admin profiles | 1:N WaitlistReservation |
| **Farm** | Production hubs | 1:N CropBatch |
| **CropBatch** | Inventory + Lifecycle | 1:N WaitlistReservation |
| **WaitlistReservation** | Zero-cost reserves | N:1 User, N:1 CropBatch, 1:1 Order |
| **Order** | Payment records | 1:1 WaitlistReservation |

---

## 🔄 STATE MACHINES

### CropBatch Lifecycle
```
SOWN → GROWING → HARVESTED → STORED_CURING → BATCH_RELEASED → ARCHIVED
```

### WaitlistReservation Flow
```
PENDING_RELEASE → AWAITING_PAYMENT → PAID_READY_FOR_PICKUP → COMPLETED
                                  ↓ (Timeout/Cancel)
                                CANCELLED
```

### Order Payment Status
```
INITIATED → SUCCESS
        ↓
       FAILED
```

---

## 🔑 REPOSITORY KEY METHODS

### UserRepository
```java
findByPhoneNumber(String)           // Unique lookup
findByRole(Role)                    // Filter by role
existsByPhoneNumber(String)         // Quick check
```

### CropBatchRepository
```java
findByCurrentStage(CropStage)       // Filter by stage
findAllActive()                     // Exclude archived (JPA-QL)
findByIdAndActive(Long)             // Verify active (JPA-QL)
findByFarmId(Long)                  // Farm filter
```

### WaitlistReservationRepository (CRITICAL)
```java
findPendingReleaseByBatchIdFifo(Long)  // FIFO queue (JPA-QL + ORDER BY)
findAllReadyForPickup()                 // For manifest (JPA-QL)
getTotalReservedQuantity(Long)          // Validation (Aggregate)
countPendingReleaseByBatchId(Long)      // Queue size
```

### OrderRepository
```java
findByPaymentTransactionId(String)      // Webhook idempotency
findByPaymentStatus(PaymentStatus)      // Filter by status
findSuccessfulOrdersByCustomerId(Long)  // Order history (JPA-QL)
```

---

## 💼 BUSINESS RULES (3 CRITICAL)

### Rule 1: Waitlist Allocation (In Service)
```java
if (requestedQty > batch.availableYieldKg) 
    throw InsufficientYieldException;
batch.availableYieldKg -= requestedQty;  // ATOMIC
```

### Rule 2: Batch Release (Admin Endpoint)
```
1. Set: currentStage = BATCH_RELEASED, finalRetailPricePerKg
2. Query: findPendingReleaseByBatchIdFifo()  ← FIFO ORDERING
3. For each: calculatedAmount = qty × price
4. Transition: status = AWAITING_PAYMENT
5. Create: Order(INITIATED)
```

### Rule 3: Logistics Manifest (Admin Endpoint)
```
1. Query: findAllReadyForPickup()
2. Group: BY pickupLocation, BY cropName
3. Aggregate: SUM(requestedQuantityKg)
4. Return: Manifest for packing
```

---

## 📡 HTTP ENDPOINTS (PHASE 1 MVP)

### Customer Endpoints
```
GET  /api/v1/crops/feedList                    → Active batches
GET  /api/v1/crops/{batchId}/timeline          → Crop history
POST /api/v1/waitlist/reserve                  → Create reservation
GET  /api/v1/reservations/user/{userId}        → My reservations
POST /api/v1/payments/create-intent            → Payment link
POST /api/v1/payments/webhook                  → Payment confirmation
```

### Admin Endpoints
```
POST /api/v1/admin/batches                     → Create batch
POST /api/v1/admin/batches/{id}/timeline-event → Add event
POST /api/v1/admin/batches/{id}/release        → Release batch (Rule 2)
GET  /api/v1/admin/logistics/manifest          → Manifest (Rule 3)
PATCH /api/v1/admin/reservations/{id}/complete → Mark pickup
```

---

## ⚙️ ANNOTATIONS CHEAT SHEET

### JPA Annotations
```java
@Entity                    // Map to database table
@Table(name="...")         // Custom table name
@Id @GeneratedValue        // Primary key
@Column(name="...", ...)   // Column mapping
@ManyToOne, @OneToMany     // Relationships
@Enumerated(EnumType.STRING)  // Enum column
```

### Lombok Annotations
```java
@Data                      // Getter, Setter, ToString, Equals, HashCode
@Builder                   // Builder pattern
@NoArgsConstructor         // Default constructor
@AllArgsConstructor        // All-args constructor
@Slf4j                     // Logger injection
```

### Spring Annotations
```java
@Service                   // Service layer bean
@Repository                // Repository bean
@Transactional             // Transaction management
@RequiredArgsConstructor   // Constructor injection (with Lombok)
@Transactional(readOnly=true)  // Read-only queries
```

---

## 🗄️ DATABASE INDEXES (13 Total)

```
users:
  - idx_phone_number (UNIQUE)
  - idx_role

farms:
  - idx_farm_name
  - idx_is_primary_hub

crop_batches:
  - idx_farm_id
  - idx_current_stage
  - idx_crop_name
  - idx_seed_variety

waitlist_reservations:  ← MOST CRITICAL
  - idx_user_id
  - idx_crop_batch_id
  - idx_status
  - idx_user_batch (composite)
  - idx_created_at (for FIFO sorting)

orders:
  - idx_payment_status
  - idx_payment_transaction_id
```

---

## 🚀 MAVEN QUICK COMMANDS

```bash
./mvnw.cmd clean compile          # Compile
./mvnw.cmd spring-boot:run        # Run app
./mvnw.cmd test                   # Run tests
./mvnw.cmd clean package          # Build JAR
./mvnw.cmd dependency:tree        # View deps
./mvnw.cmd spotless:apply         # Format code
```

---

## 🔐 SECURITY CHECKLIST

- [ ] Validate all inputs in service layer
- [ ] Use @Transactional for critical operations
- [ ] Enable query logging in debug mode only
- [ ] Use parameterized queries (JPA prevents SQL injection)
- [ ] Hash passwords (Phase 2)
- [ ] Implement JWT tokens (Phase 2)
- [ ] Rate limiting (Phase 2)
- [ ] HTTPS only (Phase 2)

---

## 📈 PERFORMANCE TIPS

1. **Always use FetchType.LAZY** to prevent N+1
2. **Create indexes on FK + frequently queried columns** ✓ Done
3. **Use custom JPA-QL for complex queries** (see repositories)
4. **Enable Hibernate batch processing** ✓ Batch size: 25
5. **Connection pooling** ✓ HikariCP max: 20
6. **Read-only @Transactional** for queries
7. **Pagination for list endpoints** (20 default, max 100)

---

## 🧪 TESTING PATTERNS

### Repository Test (Using TestContainers)
```java
@DataJpaTest
@Testcontainers
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = 
        new PostgreSQLContainer<>("postgres:15");
    
    @Autowired
    UserRepository repo;
    
    @Test
    void shouldFindByPhoneNumber() {
        User user = User.builder()
            .phoneNumber("9876543210")
            .build();
        repo.save(user);
        
        User found = repo.findByPhoneNumber("9876543210").orElse(null);
        assertNotNull(found);
    }
}
```

### Service Test (Unit)
```java
@ExtendWith(MockitoExtension.class)
class WaitlistReservationServiceTest {
    @Mock
    private WaitlistReservationRepository reservationRepo;
    
    @Mock
    private CropBatchRepository batchRepo;
    
    @InjectMocks
    private WaitlistReservationService service;
    
    @Test
    void shouldThrowExceptionWhenYieldInsufficient() {
        CropBatch batch = CropBatch.builder()
            .availableYieldKg(5.0)
            .build();
        
        assertThrows(InsufficientYieldException.class,
            () -> service.createReservation(1L, 1L, 10.0, "PUNE_OFFICE")
        );
    }
}
```

---

## 📚 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| **INITIALIZATION_GUIDE.md** | Complete architecture & setup |
| **API_CONTRACTS.md** | All REST endpoints with examples |
| **SETUP_AND_VERIFICATION.md** | Environment setup & troubleshooting |
| **INITIALIZATION_SUMMARY.md** | High-level overview |
| **This file** | Quick reference card |

---

## 🔗 KEY CONCEPTS

**Lombok** → Boilerplate reduction (getters, setters, constructors)  
**JPA** → Object-relational mapping (entities → database)  
**Spring Data** → Repository pattern (CRUD + custom queries)  
**Transactions** → ACID compliance (@Transactional)  
**Lazy Loading** → FetchType.LAZY prevents N+1 queries  
**FIFO Queue** → ORDER BY createdAt ASC in queries  
**Batch Release** → Admin-triggered pricing + allocation  

---

## ⚡ COMMON PATTERNS

### Entity Creation with Lombok
```java
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MyEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String field;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
```

### Repository with Custom Query
```java
@Repository
public interface MyRepository extends JpaRepository<MyEntity, Long> {
    @Query("SELECT e FROM MyEntity e WHERE e.status = 'ACTIVE' ORDER BY e.createdAt ASC")
    List<MyEntity> findActiveOrderedByDate();
}
```

### Service with Validation
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class MyService {
    private final MyRepository repo;
    
    @Transactional
    public MyEntity create(String field) {
        if (field == null || field.isEmpty()) {
            throw new IllegalArgumentException("Field required");
        }
        
        MyEntity entity = MyEntity.builder()
            .field(field)
            .build();
        
        log.info("Creating entity: {}", field);
        return repo.save(entity);
    }
}
```

---

## 🛠️ TROUBLESHOOTING FLOWCHART

```
Problem → Check
├─ Compilation fails → Verify JAVA_HOME, Lombok processor in pom.xml
├─ DB connection error → Check PostgreSQL running, connection string, database exists
├─ N+1 query problem → Use FetchType.LAZY, add Join queries
├─ Transaction timeout → Increase timeout in application.yaml
├─ Memory exhausted → Increase JVM heap: -Xmx1024m
└─ Performance slow → Check indexes, enable batch processing, pagination
```

---

**Print this card and keep at desk!**  
**Last Updated:** 2026-09-18

