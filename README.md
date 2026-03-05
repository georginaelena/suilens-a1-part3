# Suilens - Sistem Rental Lensa Studio Komet Biru

**Bagian 3: Penugasan Mandiri - Studio Komet Biru**
## 👤 Author

**Georgina Elena Shinta Dewi Achti**  
NPM: 2206810995

---


## 📋 Daftar Isi

- [Overview](#overview)
- [Arsitektur](#arsitektur)
- [Struktur Project](#struktur-project)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [API Documentation](#api-documentation)

---

## 🎯 Overview

Suilens adalah sistem rental lensa untuk Studio Komet Biru yang mengimplementasikan arsitektur microservices dengan saga pattern. Sistem ini mendukung:

- **Multi-branch inventory management** (Jakarta Selatan, Jakarta Utara, Bandung)
- **Synchronous stock reservation** untuk immediate feedback
- **Asynchronous compensating actions** untuk order cancellation
- **Resilient event-driven architecture** dengan RabbitMQ
- **Real-time stock updates** di frontend

*Git Repository* : https://github.com/georginaelena/suilens-a1-part3

---

## 🏗️ Arsitektur

### Diagram Arsitektur

![](https://i.imgur.com/mwc5l2s.png)

---

### Flow Patterns

#### 1. **Order Creation (Sync Reserve)**
```
User → Order Service → Inventory Service (reserve stock)
                    ↓
                 RabbitMQ → Notification Service
```
- **Synchronous**: Order creation & stock reservation
- **Asynchronous**: Notification sending

#### 2. **Order Cancellation (Async Compensate)**
```
User → Order Service (cancel order)
                    ↓
                 RabbitMQ (publish 'order.cancelled')
                    ↓
             Inventory Consumer → Release stock
```
- **Event-driven**: Decoupled compensation
- **Idempotent**: Safe retries via reservations table

---


## 📁 Struktur Project

```
suilens-a1-part3/
├── docker-compose.yml              # Orchestration
├── README.md                       # This file (D1)
│
├── frontend/suilens-frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.vue           # Home page (order creation)
│   │   │   └── MyOrders.vue        # Order management
│   │   ├── composables/
│   │   │   ├── useLenses.ts        # Catalog data fetching
│   │   │   ├── useOrders.ts        # Order operations
│   │   │   └── useInventory.ts     # Stock data (auto-refetch)
│   │   └── stores/
│   │       └── cart.ts             # Order form state
│   └── package.json
│
├── services/
│   ├── catalog-service/
│   │   ├── src/
│   │   │   ├── index.ts            # Lens CRUD APIs
│   │   │   └── db/
│   │   │       ├── schema.ts       # lenses table
│   │   │       └── seed.ts         # 5 lens models
│   │   └── Dockerfile
│   │
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── index.ts            # Order APIs + cancel endpoint
│   │   │   ├── events.ts           # RabbitMQ publisher
│   │   │   └── db/
│   │   │       └── schema.ts       # orders table (with branchCode)
│   │   └── Dockerfile
│   │
│   ├── inventory-service/
│   │   ├── src/
│   │   │   ├── index.ts            # Inventory APIs (reserve/release)
│   │   │   ├── consumer.ts         # RabbitMQ consumer (cancel events)
│   │   │   └── db/
│   │   │       ├── schema.ts       # branches, inventory, reservations
│   │   │       └── seed.ts         # Multi-branch stock data
│   │   └── Dockerfile
│   │
│   └── notification-service/
│       ├── src/
│       │   ├── index.ts            # Notification APIs
│       │   ├── consumer.ts         # Listen to order events
│       │   └── db/
│       │       └── schema.ts       # notifications table
│       └── Dockerfile
```

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Port availability: 4001-4004, 5174, 5437-5440, 5680, 15680

### Fresh Installation (Clean Start)

**⚠️ IMPORTANT: For assignment demo or if you have old testing data, use this method!**

```bash
# 1. Clone repository
git clone <repository-url>
cd suilens-a1-part3

# 2. Clean start (delete old data + fresh seed)
docker compose down -v
docker compose up -d --build

# 3. Wait for services to be healthy (~30 seconds)
sleep 30
docker compose ps

# 4. Open frontend
open http://localhost:5174

# 5. Access RabbitMQ Management UI (optional)
open http://localhost:15680
# Credentials: guest / guest
```

**Expected Fresh State:**
- ✅ Lenses: 5 items
- ✅ Inventory: 15 records (no duplicates)
- ✅ Orders: 0 (empty - correct!)
- ✅ Notifications: 0 (empty)


### Quick Restart

```bash
# Stop services (keep data)
docker compose down

# Start again
docker compose up -d --build
```

### Verification

```bash
# Check all services are running
docker compose ps

# Expected output:
# NAME                      STATUS
# catalog-db                Up (healthy)
# catalog-service           Up
# frontend                  Up
# inventory-db              Up (healthy)
# inventory-service         Up
# notification-db           Up (healthy)
# notification-service      Up
# order-db                  Up (healthy)
# order-service             Up
# rabbitmq                  Up (healthy)

# Test APIs
curl http://localhost:4001/api/lenses | jq
curl http://localhost:4004/api/branches | jq
```

---

## 🧪 Testing

### Manual Testing Flow

#### Test 1: Create Order (Sync Reserve)

```bash
# 1. Check available stock
curl http://localhost:4004/api/inventory/KB-JKT-S/550e8400-e29b-41d4-a716-446655440001 | jq

# 2. Create order
curl -X POST http://localhost:4002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "lensId": "550e8400-e29b-41d4-a716-446655440001",
    "branchCode": "KB-JKT-S",
    "startDate": "2026-03-10",
    "endDate": "2026-03-15"
  }' | jq

# 3. Verify stock decreased
curl http://localhost:4004/api/inventory/KB-JKT-S/550e8400-e29b-41d4-a716-446655440001 | jq
# Should show availableQuantity reduced by 1

# 4. Check order created
curl http://localhost:4002/api/orders | jq
```

#### Test 2: Cancel Order (Async Compensate)

```bash
# 1. Get order ID from previous test
ORDER_ID="<orderId-from-test-1>"

# 2. Cancel order
curl -X PATCH http://localhost:4002/api/orders/$ORDER_ID/cancel | jq

# 3. Check RabbitMQ logs (event published)
docker compose logs order-service | grep "order.cancelled"

# 4. Check Inventory Consumer logs (event consumed)
docker compose logs inventory-service | grep "order.cancelled"

# 5. Verify stock released (wait 1-3 seconds)
curl http://localhost:4004/api/inventory/KB-JKT-S/550e8400-e29b-41d4-a716-446655440001 | jq
# Should show availableQuantity increased back
```

#### Test 3: Idempotency (Double Cancel)

```bash
# Cancel same order again
curl -X PATCH http://localhost:4002/api/orders/$ORDER_ID/cancel | jq

# Should return error: "Order already cancelled"

# Check inventory consumer logs
docker compose logs inventory-service | tail -20
# Should see: "✅ Stock already released (idempotent)"
```

#### Test 4: Out-of-Stock Rejection

```bash
# Try to order with insufficient stock
curl -X POST http://localhost:4002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test OOS",
    "customerEmail": "test@oos.com",
    "lensId": "550e8400-e29b-41d4-a716-446655440001",
    "branchCode": "KB-BDG-C",
    "startDate": "2026-03-20",
    "endDate": "2026-03-25"
  }' | jq

# Expected: 400 Bad Request with "Out of stock" error
```

### Frontend Testing

1. **Open http://localhost:5174**
2. **Select branch** KB-JKT-S from dropdown
3. **Observe stock quantities** update every 3 seconds
4. **Select lens** "Canon EF 24mm f/1.4L II USM"
5. **Fill form** dengan tanggal rental
6. **Click "Select This Lens"**
7. **Verify snackbar** "Order created successfully!"
8. **Navigate to "My Orders"** (icon di navbar)
9. **Click "Cancel"** pada order
10. **Confirm cancellation**
11. **Verify stock** kembali ke homepage, stock bertambah

---

## 📡 API Documentation

### Catalog Service (Port 4001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lenses` | Get all lenses |
| GET | `/api/lenses/:id` | Get lens by ID |
| POST | `/api/lenses` | Create lens (admin) |

### Order Service (Port 4002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| GET | `/api/orders/:id` | Get order by ID |
| POST | `/api/orders` | Create order (reserves stock) |
| PATCH | `/api/orders/:id/cancel` | Cancel order (publishes event) |

**Order Creation Request:**
```json
{
  "customerName": "Elena",
  "customerEmail": "elena@example.com",
  "lensId": "550e8400-e29b-41d4-a716-446655440001",
  "branchCode": "KB-JKT-S",
  "startDate": "2026-03-10",
  "endDate": "2026-03-15"
}
```

### Inventory Service (Port 4004)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/branches` | Get all branches |
| GET | `/api/inventory` | Get all inventory |
| GET | `/api/inventory/:branchCode` | Get inventory by branch |
| GET | `/api/inventory/:branchCode/:lensId` | Get specific stock |
| POST | `/api/inventory/reserve` | Reserve stock (idempotent) |
| POST | `/api/inventory/release` | Release stock (idempotent) |

**Reserve Request:**
```json
{
  "orderId": "uuid-here",
  "lensId": "550e8400-e29b-41d4-a716-446655440001",
  "branchCode": "KB-JKT-S",
  "quantity": 1
}
```

**Release Request:**
```json
{
  "orderId": "uuid-here"
}
```

### Notification Service (Port 4003)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/:orderId` | Get notifications by order |

---

