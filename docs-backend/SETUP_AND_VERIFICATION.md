# Setup & Verification Checklist - Seed & Plate Backend

**Created:** 2026-09-18  
**Status:** Initialization Complete - Awaiting Environment Setup

---

## 🔧 ENVIRONMENT SETUP REQUIREMENTS

### Prerequisites (Before Running)

- [ ] **Java 21** - Required
  ```bash
  java -version
  # Should output: openjdk version "21" or later
  ```
  - Download from: https://adoptium.net/ or https://www.oracle.com/java/technologies/downloads/

- [ ] **PostgreSQL 12+** - Required
  ```bash
  psql --version
  # Should output: psql (PostgreSQL) 12.0 or later
  ```
  - Download from: https://www.postgresql.org/download/

- [ ] **Git** - Recommended
  ```bash
  git --version
  ```

### Environment Variables

**JAVA_HOME** must be set:
```bash
# Windows
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.0

# Linux/Mac
export JAVA_HOME=/usr/libexec/java_home -v 21
```

**PostgreSQL PATH** (optional but helpful):
```bash
# Windows
set PATH=%PATH%;C:\Program Files\PostgreSQL\15\bin
```

---

## 📋 PRE-BUILD VERIFICATION

Before running Maven, verify all files exist:

### Java Source Files (22 files)

**Entities (5):**
```
✓ src/main/java/com/farm/seedtoplate/entity/User.java
✓ src/main/java/com/farm/seedtoplate/entity/Farm.java
✓ src/main/java/com/farm/seedtoplate/entity/CropBatch.java
✓ src/main/java/com/farm/seedtoplate/entity/WaitlistReservation.java
✓ src/main/java/com/farm/seedtoplate/entity/Order.java
```

**Enums (5):**
```
✓ src/main/java/com/farm/seedtoplate/enums/PickupLocation.java
✓ src/main/java/com/farm/seedtoplate/enums/Role.java
✓ src/main/java/com/farm/seedtoplate/enums/CropStage.java
✓ src/main/java/com/farm/seedtoplate/enums/ReservationStatus.java
✓ src/main/java/com/farm/seedtoplate/enums/PaymentStatus.java
```

**Repositories (5):**
```
✓ src/main/java/com/farm/seedtoplate/repository/UserRepository.java
✓ src/main/java/com/farm/seedtoplate/repository/FarmRepository.java
✓ src/main/java/com/farm/seedtoplate/repository/CropBatchRepository.java
✓ src/main/java/com/farm/seedtoplate/repository/WaitlistReservationRepository.java
✓ src/main/java/com/farm/seedtoplate/repository/OrderRepository.java
```

**Exceptions (2):**
```
✓ src/main/java/com/farm/seedtoplate/exception/InsufficientYieldException.java
✓ src/main/java/com/farm/seedtoplate/exception/ResourceNotFoundException.java
```

**Configuration (1):**
```
✓ src/main/java/com/farm/seedtoplate/config/JpaConfig.java
```

**Service (1):**
```
✓ src/main/java/com/farm/seedtoplate/service/WaitlistReservationService.java
```

**Application Entry Point (1):**
```
✓ src/main/java/com/farm/seedtoplate/SeedtoplateApplication.java
```

**Documentation (3):**
```
✓ INITIALIZATION_GUIDE.md
✓ API_CONTRACTS.md
✓ INITIALIZATION_SUMMARY.md
```

---

## 🗄️ DATABASE SETUP STEPS

### Step 1: Verify PostgreSQL Installation
```bash
psql --version
psql -U postgres -c "SELECT version();"
```

### Step 2: Create Database
```bash
# Using createdb utility
createdb -U postgres -E UTF8 seedtoplate

# Or using psql
psql -U postgres
CREATE DATABASE seedtoplate ENCODING 'UTF8';
\q
```

### Step 3: Load Schema
```bash
# From project root directory
psql -U postgres -d seedtoplate -f src/main/resources/db/schema.sql
```

### Step 4: Verify Schema Created
```bash
psql -U postgres -d seedtoplate
\dt
# Should show 6 tables:
# - users
# - farms
# - crop_batches
# - batch_timeline_events
# - waitlist_reservations
# - orders
\q
```

### Step 5: Verify Indexes
```bash
psql -U postgres -d seedtoplate
\di
# Should show ~13 indexes
```

---

## 🏗️ BUILD & COMPILATION

### Step 1: Clean and Compile
```bash
cd "C:\Users\kajol\Downloads\seedtoplate\seedtoplate"

# Windows
.\mvnw.cmd clean compile

# Linux/Mac
./mvnw clean compile
```

**Expected Output:**
```
[INFO] BUILD SUCCESS
[INFO] Total time: XX.XXX s
[INFO] Finished at: 2026-09-18T...
```

### Step 2: Run Tests
```bash
# Windows
.\mvnw.cmd test

# Linux/Mac
./mvnw test
```

### Step 3: Build JAR
```bash
# Windows
.\mvnw.cmd clean package

# Linux/Mac
./mvnw clean package
```

**Output Location:** `target/seedtoplate-0.0.1-SNAPSHOT.jar`

---

## 🚀 RUNNING THE APPLICATION

### Option 1: Maven Spring Boot Plugin (Development)
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

**Expected Output:**
```
INFO 12345 --- [main] com.farm.seedtoplate.SeedtoplateApplication : 
Started SeedtoplateApplication in 4.123 seconds (JVM running for 4.567)
```

### Option 2: Docker Compose (Recommended for Team Development)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: seedtoplate-db
    environment:
      POSTGRES_DB: seedtoplate
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/main/resources/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: ..
    container_name: seedtoplate-app
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/seedtoplate
      JAVA_OPTS: "-Xmx512m -Xms256m"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

**Run with Docker Compose:**
```bash
docker-compose up -d
```

### Option 3: Run Compiled JAR
```bash
# After building with ./mvnw package
java -jar target/seedtoplate-0.0.1-SNAPSHOT.jar
```

---

## ✅ POST-STARTUP VERIFICATION

### Check Application Health
```bash
# Health endpoint (if actuator added later)
curl http://localhost:8080/actuator/health

# Expected: 200 OK
```

### Test Database Connection
```bash
# Get crop feed (empty initially)
curl http://localhost:8080/api/v1/crops/feedList

# Expected: 
# {
#   "status": "SUCCESS",
#   "data": {
#     "content": [],
#     "totalElements": 0
#   }
# }
```

### Check Application Logs
```bash
# If running with docker-compose
docker logs seedtoplate-app

# Look for:
# - HikariPool-1 - Connection is valid
# - Hibernate: SELECT 1 (if logging enabled)
# - Started SeedtoplateApplication
```

---

## 🐛 TROUBLESHOOTING

### Issue: "JAVA_HOME is not defined"
**Solution:**
```bash
# Find Java installation
where java  # Windows
which java  # Linux/Mac

# Set JAVA_HOME
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.0  # Windows
export JAVA_HOME=/usr/libexec/java_home -v 21              # Mac
```

### Issue: "Could not connect to database"
**Solution:**
```bash
# Verify PostgreSQL is running
psql -U postgres

# Check application.yaml settings
grep -A 5 "datasource:" src/main/resources/application.yaml

# Verify database exists
psql -U postgres -l | grep seedtoplate
```

### Issue: "Compilation failed - Lombok not working"
**Solution:**
```bash
# Force clean compile
./mvnw.cmd clean -U compile

# Check Lombok processor in pom.xml
grep -A 5 "annotationProcessorPaths" pom.xml
```

### Issue: "Tables not found" (after startup)
**Solution:**
```bash
# Recreate schema
psql -U postgres -d seedtoplate -f src/main/resources/db/schema.sql

# Verify
psql -U postgres -d seedtoplate -c "\dt"
```

### Issue: "Connection pool exhausted"
**Solution:**
- Increase HikariCP pool size in `application.yaml`
- Check for unclosed database connections in code
- Monitor with: `SELECT count(*) FROM pg_stat_activity;`

---

## 📊 IDE SETUP (IntelliJ IDEA / Eclipse / VS Code)

### IntelliJ IDEA
1. Open project: File → Open → Select seedtoplate folder
2. Configure SDK: File → Project Structure → Project
   - Set SDK to Java 21
3. Enable Lombok: Settings → Plugins → Search "Lombok" → Install
4. Reload project: File → Reload All from Disk
5. Build: Build → Build Project

### Eclipse
1. Import: File → Import → Maven → Existing Maven Projects
2. Select seedtoplate folder
3. Install Lombok: Right-click project → Maven → Install Lombok
4. Right-click project → Maven → Update Project
5. Build: Project → Build Project

### VS Code
1. Install extensions:
   - Extension Pack for Java (Microsoft)
   - Spring Boot Extension Pack
   - Lombok Annotations Support
2. Open folder: File → Open Folder → seedtoplate
3. VS Code will auto-configure Maven & Java

---

## 📈 PERFORMANCE BASELINE TESTS

After startup, run these performance checks:

### 1. Database Query Performance
```bash
# Test query response time
time curl http://localhost:8080/api/v1/crops/feedList

# Expected: < 200ms for empty table
```

### 2. Connection Pool Health
```bash
# Monitor active connections
psql -U postgres -d seedtoplate -c "SELECT count(*) FROM pg_stat_activity WHERE datname='seedtoplate';"

# Should be: 1-5 (idle pool connections)
```

### 3. Memory Usage
```bash
# Check JVM memory
java -XX:+PrintFlagsFinal -version | grep -i heapsize

# Adjust in application startup if needed
# Default: -Xmx512m -Xms256m
```

---

## 📝 USEFUL MAVEN COMMANDS

```bash
# Clean & build
./mvnw.cmd clean package

# Skip tests
./mvnw.cmd clean package -DskipTests

# Run specific test
./mvnw.cmd test -Dtest=UserRepositoryTest

# View dependency tree
./mvnw.cmd dependency:tree

# Update dependencies
./mvnw.cmd versions:display-dependency-updates

# Format code
./mvnw.cmd spotless:apply

# Generate documentation
./mvnw.cmd javadoc:javadoc
```

---

## 🔄 CONTINUOUS INTEGRATION PREPARATION

### For GitHub Actions
Create `.github/workflows/build.yml`:
```yaml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: seedtoplate
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      - run: ./mvnw clean package
      - run: ./mvnw test
```

---

## ✨ NEXT STEPS

After successful startup:

1. **Create REST Controllers** - Implement the endpoints from API_CONTRACTS.md
2. **Write Service Tests** - Extend WaitlistReservationService with unit tests
3. **Add Global Exception Handler** - @ControllerAdvice for error responses
4. **Implement Logging** - Add comprehensive logging to services
5. **Create API Documentation** - Swagger/OpenAPI with Springdoc
6. **Load Testing** - Use Apache JMeter or k6 for performance testing

---

## 📞 TEAM CONTACT & ESCALATION

**Stuck?** Check:
1. `INITIALIZATION_GUIDE.md` - Architecture & entity documentation
2. `API_CONTRACTS.md` - REST API specifications
3. `INITIALIZATION_SUMMARY.md` - Complete file listing

---

**Last Updated:** 2026-09-18  
**Next Review:** When Phase 1 development starts (Week 3)

