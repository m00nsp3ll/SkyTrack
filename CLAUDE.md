# CLAUDE.md — SkyTrack Project Instructions

## What is this project?
SkyTrack is a full-stack web application for managing a paragliding cooperative in Alanya, Turkey. It handles customer registration, pilot rotation, flight tracking, media (photo/video) management, and point-of-sale operations — all linked via QR codes on a local network.

## Memory Bank
Before starting ANY work, read all memory bank files to understand the full context:

1. `memory-bank/projectbrief.md` — Project overview and goals
2. `memory-bank/productContext.md` — Detailed user flows, data entities, requirements
3. `memory-bank/techArchitecture.md` — Tech stack, architecture, database schema, API design
4. `memory-bank/systemPatterns.md` — Project structure, coding conventions, naming
5. `memory-bank/progress.md` — What's done, what's next, known issues
6. `memory-bank/activeContext.md` — Current focus area and recent decisions

## Critical Rules
1. **Turkish UI**: All user-facing text must be in Turkish. Code/comments in English.
2. **Local Network First**: The app runs on LAN (192.168.1.100). No cloud dependency for core features. Server IP must be configurable via `SERVER_IP` in `.env`.
3. **QR Code = Universal ID**: Every customer operation uses QR code scanning. QR encodes `http://{SERVER_IP}/c/{display_id}`.
4. **Pilot Queue Fairness**: Round-robin rotation. Pilot with fewest flights gets next customer. Max 7 flights/day.
5. **Media on Local Storage**: Photos/videos stored on local filesystem, NOT cloud. Delivered via LAN WiFi.
6. **Mobile First for Pilots**: Pilot panel must be fully responsive/usable on mobile.
7. **No App Install**: Customers scan QR with native phone camera. Landing page must work in mobile Safari and Chrome.

## Tech Stack Summary
- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Backend**: Express.js + Prisma + PostgreSQL
- **Real-time**: Socket.IO
- **QR**: `qrcode` (generation) + `html5-qrcode` (scanning)
- **Files**: Multer upload + sharp thumbnails + local filesystem

## When Starting a New Phase
1. Read `memory-bank/progress.md` to see current status
2. Read `memory-bank/activeContext.md` for what's being worked on
3. After completing work, update both files

## When Making Architectural Decisions
1. Check `memory-bank/techArchitecture.md` for existing decisions
2. If making a new decision, document it in that file
3. Keep consistency with established patterns in `memory-bank/systemPatterns.md`

## Environment Variables (.env)
```
DATABASE_URL=postgresql://skytrack:skytrack@localhost:5432/skytrack
SERVER_IP=192.168.1.100
SERVER_PORT=3001
NEXT_PUBLIC_SERVER_IP=192.168.1.100
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api
JWT_SECRET=your-secret-key-here
MEDIA_STORAGE_PATH=./media
MAX_DAILY_FLIGHTS=7
```
