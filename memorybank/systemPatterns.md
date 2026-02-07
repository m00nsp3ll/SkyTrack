# System Patterns & Coding Conventions

## Project Structure
```
skytrack/
├── package.json              # Root workspace
├── .env                      # Environment variables
├── .env.example
├── docker-compose.yml        # PostgreSQL + optional services
│
├── packages/
│   ├── web/                  # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (auth)/       # Login pages
│   │   │   ├── (dashboard)/  # Admin dashboard
│   │   │   ├── pilot/        # Pilot panel
│   │   │   ├── pos/          # Point of sale
│   │   │   ├── media/        # Media seller panel
│   │   │   ├── customer/     # Customer-facing (QR landing, download)
│   │   │   └── api/          # Next.js API routes (proxy to backend)
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── forms/        # Registration, waiver forms
│   │   │   ├── qr/           # QR generator, scanner
│   │   │   ├── flight/       # Flight status components
│   │   │   └── layout/       # Nav, sidebar, etc.
│   │   ├── lib/
│   │   │   ├── api.ts        # API client
│   │   │   ├── socket.ts     # Socket.IO client
│   │   │   └── utils.ts
│   │   └── public/
│   │       └── locales/
│   │           └── tr/        # Turkish translations
│   │
│   └── api/                  # Express.js Backend
│       ├── src/
│       │   ├── index.ts      # Entry point
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── customers.ts
│       │   │   ├── pilots.ts
│       │   │   ├── flights.ts
│       │   │   ├── media.ts
│       │   │   ├── sales.ts
│       │   │   └── reports.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── roles.ts
│       │   │   └── upload.ts
│       │   ├── services/
│       │   │   ├── pilotQueue.ts
│       │   │   ├── qrGenerator.ts
│       │   │   ├── mediaManager.ts
│       │   │   └── notification.ts
│       │   ├── socket/
│       │   │   └── index.ts   # Socket.IO setup
│       │   ├── cron/
│       │   │   └── dailyReset.ts
│       │   └── prisma/
│       │       ├── schema.prisma
│       │       ├── seed.ts
│       │       └── migrations/
│       └── media/             # Local file storage root
│           └── .gitkeep
│
└── scripts/
    ├── setup.sh              # Initial setup script
    └── deploy.sh             # Local deployment script
```

## Coding Patterns

### API Response Format
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: "PILOT_LIMIT_REACHED", message: "..." } }

// Paginated
{ success: true, data: [...], pagination: { page, limit, total } }
```

### Turkish UI Labels (Consistent Naming)
```
Müşteri = Customer
Pilot = Pilot
Uçuş = Flight
Kayıt = Registration
Risk Formu = Waiver/Risk Form
QR Kod = QR Code
Fotoğraf = Photo
Video = Video
Satış = Sale
Ödendi = Paid
Ödenmedi = Unpaid
Uçuştayım = In Flight
Uçuş Bitti = Flight Complete
Müşteriyi Aldım = Customer Picked Up
İndir = Download
Yönetim Paneli = Admin Panel
Pilot Paneli = Pilot Panel
Günlük Rapor = Daily Report
```

### Error Handling Pattern
```typescript
// All async route handlers wrapped in try-catch
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Global error middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
});
```

### Socket.IO Event Naming
```
customer:registered    → New customer registered
customer:assigned      → Customer assigned to pilot
flight:pickup          → Pilot picked up customer
flight:takeoff         → Flight started
flight:landed          → Flight completed
media:uploaded         → New media files added
media:payment          → Media payment recorded
media:delivered        → Customer downloaded media
sale:created           → New POS sale
pilot:status-changed   → Pilot status update
```

### Authentication Pattern
- JWT stored in httpOnly cookie (not localStorage)
- Token contains: { userId, role, pilotId? }
- Middleware checks role before route access
- Refresh token rotation for long sessions

### File Upload Pattern
- Max file size: 100MB per file (videos)
- Accepted: .jpg, .jpeg, .png, .mp4, .mov
- On upload: generate thumbnail, update MediaFolder counts
- Serve via Express static or stream for large files
