# Technical Architecture & Decisions

## Recommended Tech Stack

### Backend
- **Runtime**: Node.js (v20 LTS)
- **Framework**: Express.js
- **Database**: PostgreSQL (robust relational data)
- **ORM**: Prisma (type-safe, great migration support)
- **Cache**: Redis (ioredis) - pilot queue, active flights, product catalog
- **Real-time**: Socket.IO (pilot notifications, live status updates)
- **File handling**: Multer (upload), sharp (image thumbnails)
- **QR Generation**: `qrcode` npm package
- **Authentication**: JWT tokens with role-based access control (RBAC)
- **Scheduler**: node-cron (daily pilot counter reset)
- **Performance**: compression (gzip), express-rate-limit

### Frontend
- **Framework**: Next.js 14 (App Router) with React
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **QR Scanner**: `html5-qrcode` library (works on Android + iPhone)
- **Real-time**: Socket.IO client
- **PWA**: @ducanh2912/next-pwa (offline support, installable)
- **Language**: Turkish (i18n ready)

### Infrastructure
- **Deployment**: Local server (Ubuntu/Linux mini PC on local network)
- **Reverse Proxy**: Nginx (gzip, static file serving, rate limiting)
- **File Storage**: Local filesystem (mounted SSD/HDD)
- **Network**: Local WiFi modem — all devices on same LAN
- **IP**: Static local IP (e.g., 192.168.1.100)
- **Containers**: Docker Compose (PostgreSQL, Redis)

---

## Performance & Scalability (500+ Daily Customers)

### Database Optimization
- Connection pool: min 10, max 50 connections
- Indexed fields for fast queries:
  - Customer: displayId, status, createdAt, assignedPilotId
  - Pilot: status, dailyFlightCount, composite (isActive, status, dailyFlightCount)
  - Flight: status, pilotId, customerId, createdAt
  - Sale: customerId, paymentStatus, createdAt
  - MediaFolder: customerId, pilotId, deliveryStatus

### Redis Cache Layer
- **Pilot Queue**: 30s TTL - frequently updated
- **Active Flights**: 10s TTL - real-time data
- **Products Catalog**: 5min TTL - rarely changes
- **Individual Pilot/Customer**: 60s TTL
- Cache invalidation on data changes

### API Performance
- Gzip compression enabled
- Rate limiting: 100 req/min per IP
- QR query response target: <200ms
- Large file uploads: up to 200MB (videos)

---

## PWA-First Architecture

### Mobile App Experience
- Installable on home screen (Android + iOS)
- Offline-capable pilot panel (service worker)
- Push notification ready
- Future: Capacitor.js for native APK/IPA conversion

### Service Worker Caching
- API calls: NetworkFirst with 5min cache
- Images: CacheFirst with 30-day expiry
- Static assets: StaleWhileRevalidate with 7-day expiry

---

## Nginx Reverse Proxy

### Configuration Highlights
- `/` → Next.js (port 3000)
- `/api/` → Express API (port 3001)
- `/socket.io/` → WebSocket upgrade
- `/media/` → Static file serving (bypasses Express)
- Gzip compression enabled
- Client max body size: 200MB
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    LOCAL NETWORK (LAN)                   │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Office   │  │  Pilot   │  │ Customer │             │
│  │  PC/Tab   │  │  Phone   │  │  Phone   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │  WiFi Router  │                           │
│              │ 192.168.1.1   │                           │
│              └───────┬───────┘                           │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │    Nginx      │  ← Reverse proxy          │
│              │  (port 80)    │    + static files         │
│              └───────┬───────┘                           │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │  Local Server │                           │
│              │ 192.168.1.100│                           │
│              │               │                           │
│              │  ┌─────────┐  │                           │
│              │  │ Next.js │  │  ← PWA frontend           │
│              │  │  :3000  │  │                           │
│              │  └────┬────┘  │                           │
│              │       │       │                           │
│              │  ┌────┴────┐  │                           │
│              │  │ Express │  │  ← API + Socket.IO        │
│              │  │  :3001  │  │                           │
│              │  └────┬────┘  │                           │
│              │       │       │                           │
│              │  ┌────┴────┐  │                           │
│              │  │  Redis  │  │  ← Cache layer            │
│              │  │  :6379  │  │                           │
│              │  └─────────┘  │                           │
│              │       │       │                           │
│              │  ┌────┴────┐  │                           │
│              │  │Postgres │  │  ← Indexed, pooled        │
│              │  │  :5432  │  │                           │
│              │  └─────────┘  │                           │
│              │               │                           │
│              │  ┌─────────┐  │                           │
│              │  │  /media  │  │  ← Local file storage   │
│              │  │  folder  │  │    (Nginx serves)        │
│              │  └─────────┘  │                           │
│              └───────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### 1. QR Code Strategy
- QR encodes a URL: `http://192.168.1.100/c/{display_id}`
- Display ID format: 1 letter + 4 digits (e.g., A0001, A0002, ... A9999, B0001)
- Total capacity: 26 x 9999 = 259,974 customers
- This URL works for ALL operations: flight check, media download, POS
- Scannable by any phone camera — no app needed
- The landing page detects context (is media ready? is there a tab?)

### 2. File Storage Strategy
```
/media/
  └── {YYYY-MM-DD}/
      └── pilot_{pilot_id}/
          └── customer_{customer_display_id}/
              ├── photo_001.jpg
              ├── photo_002.jpg
              ├── video_001.mp4
              └── thumbnail/
                  ├── photo_001_thumb.jpg
                  └── photo_002_thumb.jpg
```
- Thumbnails auto-generated on upload for fast browsing
- Original files served directly for download
- Daily folders prevent single-directory bloat

### 3. Pilot Queue Algorithm
```javascript
// Pseudo-code for fair rotation
function getNextPilot() {
  const availablePilots = pilots
    .filter(p => p.is_active && p.daily_flight_count < p.max_daily_flights)
    .sort((a, b) => {
      // Primary: fewer flights first
      if (a.daily_flight_count !== b.daily_flight_count)
        return a.daily_flight_count - b.daily_flight_count;
      // Secondary: queue position (round-robin order)
      return a.queue_position - b.queue_position;
    });
  return availablePilots[0] || null; // null = no pilot available
}
```

### 4. Real-time Communication
- Socket.IO rooms per role:
  - `pilot:{pilot_id}` — individual pilot notifications
  - `admin` — all admin events
  - `media-seller` — media delivery events
- Events: `customer:assigned`, `flight:status-change`, `media:uploaded`, `sale:created`

### 5. Authentication & Roles
| Role | Access |
|------|--------|
| admin | Everything: CRUD all entities, reports, settings |
| office_staff | Customer registration, QR generation, POS |
| pilot | Own panel: see assignments, update flight status, upload media |
| media_seller | Scan QR, view media status, record media sales, trigger download |

### 6. API Route Structure
```
/api/auth/login
/api/auth/me

/api/customers (CRUD)
/api/customers/:id/qr (generate/regenerate QR)
/api/customers/:id/flights
/api/customers/:id/sales
/api/customers/:id/media

/api/pilots (CRUD)
/api/pilots/queue (get current queue status)
/api/pilots/:id/flights
/api/pilots/:id/panel (pilot dashboard data)

/api/flights (CRUD)
/api/flights/:id/status (update flight status)

/api/media/upload/:flight_id (upload photos/videos)
/api/media/:customer_id (list customer media)
/api/media/:customer_id/download (bulk download)

/api/sales (CRUD)
/api/sales/pos/:customer_id (POS operations)

/api/reports/daily
/api/reports/pilot-stats
/api/reports/revenue

/api/settings/pilot-queue
/api/settings/products (POS items catalog)
```

### 7. Offline Resilience
- Core operations work on LAN without internet
- Optional: internet for email notifications, backup sync
- Service worker for pilot PWA (works even if briefly disconnected)
