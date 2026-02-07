# Project Brief: SkyTrack - Alanya Paragliding Cooperative Management System

## Overview
A full-stack web application for managing paragliding operations at a cooperative in Alanya, Turkey. The system handles customer registration, pilot assignment, flight tracking, media management, and point-of-sale operations — all linked via QR codes.

## Core Problem
The cooperative currently manages flights, pilot rotations, customer media (photos/videos), and on-site sales manually. This leads to:
- Disorganized pilot rotation and overwork
- Lost or misdelivered customer photos/videos
- No tracking of customer purchases
- Manual payment tracking errors

## Target Users
1. **Admin/Manager** — Full system control, sales tracking, reporting
2. **Pilots** — View assigned customers, update flight status, upload media
3. **Customers** — Scan QR to receive media, make purchases
4. **Media Seller (Photo/Video Booth)** — Scan QR, deliver media, record sales

## Key Business Rules
- Pilots rotate in a **fair queue system** (round-robin)
- Each pilot can fly **maximum 7 times per day**
- Every customer gets a **unique QR code + numeric ID** at registration
- QR code is the **single identifier** used across all operations
- Media files are organized per pilot → per customer folder structure
- Media delivery happens over **local network (LAN/WiFi)** — no cloud needed for file transfer
- System must work on **Android and iPhone** browsers for QR scanning and media download

## Success Criteria
- Zero lost customer media
- Fair and transparent pilot rotation
- Real-time flight status visibility
- Complete sales/payment tracking per customer
- Fast media delivery via local network
