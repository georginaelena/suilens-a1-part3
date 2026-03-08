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
- [Asumsi Implementasi](#-asumsi-implementasi)
- [Disclosure Penggunaan AI](#-disclosure-penggunaan-ai)
- [Analisis Monolithic vs Microservices](#-analisis-monolithic-vs-microservices)

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

## 📝 Asumsi Implementasi

- Mengacu pada update instruksi, implementasi dilakukan dengan **asumsi yang eksplisit** karena masih ada edge-case yang belum didefinisikan detail.
- Dokumentasi asumsi di bawah ini digunakan sebagai dasar implementasi dan pengujian.
- Penilaian mengikuti prinsip **favourable interpretation**, dan klarifikasi lanjutan dapat diberikan jika diminta asisten penilai.
- Deadline pengumpulan mengacu pada update terbaru: **8 Maret 2026**.

### Business Logic Assumptions

1. **Stock Reservation**
   - Stock direserve secara **synchronous** saat order creation untuk immediate feedback
   - Jika stock tidak tersedia, order langsung ditolak (fail-fast)
   - Reservation bersifat **idempotent** menggunakan `orderId` sebagai unique key

2. **Order Cancellation**
   - Cancellation menggunakan **asynchronous compensating action** via RabbitMQ
   - Stock dirilis melalui event `order.cancelled` yang dikonsumsi oleh Inventory Service
   - Idempotency dijamin melalui tabel `reservations` untuk mencegah double-release

3. **Branch Selection**
   - Customer memilih branch saat membuat order (tidak ada auto-routing)
   - Setiap branch memiliki inventory independent
   - Stock tidak dapat dipindahkan antar branch secara otomatis

4. **Rental Period**
   - Sistem mencatat `startDate` dan `endDate` tetapi tidak melakukan automatic return
   - Stock tidak otomatis dirilis setelah `endDate` (butuh manual intervention atau scheduled job)
   - Untuk demo purposes, cancellation dapat dilakukan kapan saja

### Technical Assumptions

1. **Database**
   - Setiap service memiliki database terpisah (Database per Service pattern)
   - Data consistency dijaga melalui eventual consistency via events
   - Tidak ada distributed transactions (no 2PC/XA)

2. **Event Ordering**
   - Events diproses secara FIFO per queue
   - Tidak ada event ordering guarantee across multiple queues
   - Retry mechanism handled by RabbitMQ (default: requeue on consumer failure)

3. **Seed Data**
   - Seed scripts bersifat **idempotent** (check count before insert)
   - Fresh start (`docker compose down -v`) akan menghapus semua data
   - Normal restart (`docker compose down && up`) akan preserve data

4. **Frontend Polling**
   - Stock updates menggunakan polling setiap 3 detik
   - Tidak menggunakan WebSocket/SSE untuk real-time updates
   - Tradeoff: simplicity vs real-time responsiveness

---

## 🤖 Disclosure Penggunaan AI

Dalam pengerjaan project ini, setup awal, struktur utama, dan implementasi inti dikerjakan oleh saya.
Saya menggunakan AI secara terbatas sebagai **alat konsultasi teknis**, terutama ketika menemukan kendala atau error tertentu.

### Bentuk Penggunaan AI

1. **Konsultasi saat ada kendala**
   - Digunakan untuk brainstorming pendekatan saat muncul error/bug.
   - Dipakai untuk second opinion terkait root cause dan opsi perbaikan.

2. **Troubleshooting terarah**
   - Contoh: validasi ide perbaikan untuk issue TypeScript, seed idempotent, dan flow restart Docker.
   - Fokus pada debugging kasus spesifik, bukan men-generate seluruh fitur end-to-end.

3. **Review hasil diskusi AI**
   - Semua saran AI tetap saya evaluasi ulang sebelum dipakai.
   - Kode yang diadopsi tetap disesuaikan dengan konteks project dan requirement tugas.

### Verifikasi 

- Setiap perubahan tetap saya **cross-check** lewat pembacaan kode, log service, dan pengujian endpoint.
- Keputusan final implementasi (arsitektur, trade-off, dan asumsi) ditentukan oleh saya.
- AI tidak digunakan sebagai "black box"; semua output AI diperlakukan sebagai bahan referensi, bukan jawaban final.

---

## 📊 Analisis Perbandingan Monolithic vs Microservices

### (a) Skenario di mana Microservices lebih tangguh daripada Monolith

Pada sistem rental lensa dalam latihan ini, proses pembuatan order terdiri dari dua langkah utama:

- Pencatatan order
- Pembuatan notifikasi konfirmasi kepada pelanggan

Pencatatan order merupakan **fungsi utama sistem (critical path)**, sedangkan notifikasi hanya merupakan **fitur tambahan**.

Pada arsitektur **monolith**, pembuatan order dan notifikasi dilakukan dalam **satu transaksi database**. Jika proses notifikasi gagal, maka seluruh transaksi akan dibatalkan sehingga **order tidak tersimpan**. Hal ini membuat fungsi utama sistem bergantung langsung pada proses notifikasi.

Sebaliknya pada arsitektur **microservices**, proses notifikasi dipisahkan menjadi service tersendiri.  
Alur prosesnya adalah sebagai berikut:

1. Order Service membuat order dan menyimpannya terlebih dahulu.
2. Order Service mem-publish event ke **RabbitMQ**.
3. Notification Service memproses event tersebut secara **asynchronous**.

Dengan pendekatan ini, kegagalan Notification Service **tidak mempengaruhi pembuatan order**. Event notifikasi akan tetap tersimpan di message broker hingga service kembali aktif.

Untuk mendemonstrasikan perbedaan ketahanan tersebut, dilakukan percobaan dengan **mematikan Notification Service** kemudian mencoba membuat order.

### Hasil Perbandingan

| Kondisi Sistem | Monolith | Microservices |
|---|---|---|
| Notification Service dimatikan | Tidak dapat dipisahkan karena notifikasi berada dalam aplikasi yang sama | Notification Service dimatikan sementara |
| Pembuatan order | Order gagal dibuat karena proses notifikasi gagal dalam transaksi yang sama | Order tetap berhasil dibuat |
| Status transaksi | Seluruh transaksi dibatalkan (rollback) | Order berhasil tersimpan |
| Message Queue | Tidak ada mekanisme queue | Event notifikasi disimpan di RabbitMQ |
| Dampak sistem | Fungsi utama sistem ikut gagal | Fungsi utama tetap berjalan |
| Bukti Demonstrasi | ![](https://i.imgur.com/qPoPq49.png) | ![](https://i.imgur.com/N88BYyq.png) |

### (b) Skenario di mana Monolith lebih sederhana atau lebih benar

Walaupun microservices lebih tangguh terhadap kegagalan service tertentu, arsitektur **monolith lebih sederhana** untuk kasus yang membutuhkan **konsistensi transaksi yang kuat**.

Pada implementasi **monolith Suilens**, semua tabel berada dalam **satu database PostgreSQL**, sehingga integritas data dapat dijaga melalui:

- Foreign key
- Transaksi database
- Atomic commit / rollback

Sebagai contoh, pembuatan order dan notifikasi dapat dilakukan dalam **satu transaksi database**. Jika salah satu operasi gagal, maka database akan melakukan **rollback otomatis**, sehingga tidak terjadi kondisi data yang tidak konsisten.

Selain itu, query yang melibatkan beberapa tabel dapat dilakukan dengan mudah menggunakan **JOIN dalam satu query**.

Sebaliknya pada arsitektur **microservices**:

- Setiap service memiliki **database sendiri**
- Integritas data lintas service **tidak dapat dijaga dengan foreign key**
- Beberapa data perlu **diduplikasi**, misalnya snapshot informasi lensa pada Order Service


### (c) Apa yang terjadi jika Inventory Service down saat pelanggan membuat pesanan?

Pada arsitektur microservices dalam latihan ini, **reservasi stok dilakukan secara sinkron** dari Order Service ke Inventory Service.

Artinya **Inventory Service berada dalam critical path** proses pembuatan order.

Langkah pengujian yang dilakukan:

1. Inventory Service dimatikan terlebih dahulu
2. Pelanggan mencoba membuat order baru

### Hasil Percobaan

Sistem mengembalikan **error** karena Order Service tidak dapat melakukan reservasi stok ke Inventory Service.

Akibatnya:

- Proses pembuatan order **gagal**
- Order tidak dapat dibuat

Kesimpulan dari percobaan tersebut:

Jika **Inventory Service down**, maka **order tidak dapat dibuat** karena reservasi stok merupakan bagian dari proses utama sistem.


---

## #(d) Trade-off yang dibuat dan pendekatan alternatif

Dalam desain sistem pada latihan ini terdapat beberapa **trade-off**.

### Keuntungan pendekatan yang digunakan

Reservasi stok dilakukan secara **sinkron** agar sistem dapat memastikan:

- Stok benar-benar tersedia
- Risiko **overbooking** dapat dihindari

### Konsekuensi dari pendekatan tersebut

Pendekatan ini juga menimbulkan beberapa keterbatasan:

- Proses order bergantung pada **ketersediaan Inventory Service**
- Jika Inventory Service tidak tersedia, maka **Order Service tidak dapat melanjutkan proses**
- Penggunaan **database terpisah** pada setiap service menyebabkan:
  - Duplikasi data
  - Hilangnya integritas referensial lintas service (tidak ada foreign key antar service)

### Pendekatan alternatif

Beberapa pendekatan lain yang dapat digunakan untuk meningkatkan ketahanan sistem antara lain:

- **Asynchronous reservation**
- **Event-driven architecture**
- **Circuit breaker pattern**

Pendekatan tersebut dapat membantu sistem tetap berjalan meskipun salah satu service mengalami kegagalan sementara.