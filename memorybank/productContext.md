# Product Context & Requirements

## System Name: SkyTrack
## Language: Turkish UI (with English codebase)

---

## User Flows

### Flow 1: Customer Registration (Office)
```
Customer arrives → Office staff opens registration form →
Fills: Name, Surname, Email, Phone, Emergency Contact, Weight →
Signs digital risk/waiver form →
System generates: Unique ID (e.g., ST-20240615-001) + QR Code →
QR Code printed on wristband/card →
Customer is auto-assigned to next available pilot in queue
```

### Flow 2: Pilot Assignment & Rotation
```
System maintains pilot queue (round-robin) →
When customer registers, next pilot in queue is assigned →
Pilot receives push notification: "New customer: [Name], ID: [XXX]" →
Pilot's daily flight count increments →
If pilot reaches 7 flights → removed from queue for the day →
Queue wraps around when all pilots have equal flights
```

### Flow 3: Flight Lifecycle
```
Pilot sees assigned customer in their panel →
Pilot taps "Müşteriyi Aldım" (Customer Picked Up) →
Pilot taps "Uçuştayım" (In Flight) → timestamp recorded →
Pilot taps "Uçuş Bitti" (Flight Complete) → timestamp recorded →
Flight duration auto-calculated →
Customer folder created under pilot's directory: /pilots/{pilot_id}/flights/{customer_id}/
```

### Flow 4: Media Management
```
After landing, pilot uploads photos/videos to customer's folder →
Files stored on LOCAL SERVER (not cloud) →
Folder structure: /media/{pilot_id}/{customer_id}/{date}/
Media seller scans customer QR →
System shows: customer info, assigned media folder, payment status →
If PAID: customer can download via local WiFi hotspot →
If NOT PAID: media seller records payment, then enables download
```

### Flow 5: Media Delivery to Customer (LAN)
```
Customer connects to local WiFi network →
Scans QR code with phone camera (Android/iPhone) →
QR opens a local web page: http://192.168.x.x/download/{customer_id} →
Page shows thumbnails of their photos/videos →
Customer downloads files directly over LAN →
No internet required for this step
```

### Flow 6: Point of Sale (POS)
```
Customer wants to buy: cola, water, souvenirs, etc. →
Staff scans customer QR →
Adds items to customer's tab →
Records payment status (paid/unpaid) →
All purchases linked to customer ID for reporting
```

---

## Data Entities

### Customer
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| display_id | String | Human-readable: ST-YYYYMMDD-NNN |
| first_name | String | Required |
| last_name | String | Required |
| email | String | Optional |
| phone | String | Required |
| emergency_contact | String | Required |
| weight | Number | kg, for flight safety |
| qr_code | String | Encoded customer URL |
| waiver_signed | Boolean | Risk form completed |
| waiver_signed_at | DateTime | Timestamp |
| assigned_pilot_id | FK → Pilot | Auto-assigned |
| status | Enum | registered, in_flight, completed, cancelled |
| created_at | DateTime | Registration time |

### Pilot
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Full name |
| phone | String | Contact |
| email | String | For notifications |
| daily_flight_count | Number | Resets daily at midnight |
| max_daily_flights | Number | Default: 7 |
| is_active | Boolean | Available for flights |
| queue_position | Number | Current position in rotation |
| status | Enum | available, in_flight, on_break, off_duty |

### Flight
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| customer_id | FK → Customer | |
| pilot_id | FK → Pilot | |
| status | Enum | assigned, picked_up, in_flight, completed, cancelled |
| assigned_at | DateTime | |
| pickup_at | DateTime | Pilot picked up customer |
| takeoff_at | DateTime | Flight started |
| landing_at | DateTime | Flight ended |
| duration_minutes | Number | Auto-calculated |
| notes | Text | Pilot notes |

### MediaFolder
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| flight_id | FK → Flight | |
| customer_id | FK → Customer | |
| pilot_id | FK → Pilot | |
| folder_path | String | Local filesystem path |
| file_count | Number | Updated on upload |
| total_size_mb | Number | |
| delivery_status | Enum | pending, paid, delivered |
| payment_amount | Decimal | Price charged |

### Sale (POS)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| customer_id | FK → Customer | |
| item_type | Enum | photo_video, beverage, souvenir, other |
| item_name | String | e.g., "Cola", "Keychain" |
| quantity | Number | |
| unit_price | Decimal | TRY |
| total_price | Decimal | |
| payment_status | Enum | paid, unpaid |
| payment_method | Enum | cash, credit_card, transfer |
| sold_by | FK → User | Staff member |
| created_at | DateTime | |

### User (System Users)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| username | String | |
| password_hash | String | |
| role | Enum | admin, pilot, media_seller, office_staff |
| pilot_id | FK → Pilot | If role is pilot |

---

## Notification Requirements
- **Pilot notification**: When a new customer is assigned (WebSocket or push)
- **Admin notification**: When a pilot completes 7 flights
- **Media seller alert**: When a customer's media is ready for delivery

---

## Non-Functional Requirements
- Must work on **local network** (intranet) — internet not required for core operations
- Media delivery via **LAN WiFi** — fast transfer, no cloud dependency
- QR codes must work with **native phone cameras** (no app install)
- Mobile-responsive UI for pilot panels
- Turkish language interface
- Daily automatic reset of pilot flight counters (midnight)
- System should handle **500+ customers per day** (optimized with Redis cache, database indexes, connection pooling)
