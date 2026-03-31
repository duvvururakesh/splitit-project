# Splitit — System Design Document

## Overview
Splitit is a web app to track shared expenses between friends and groups, with AI-powered receipt scanning via QR code or image upload.

---

## Users & Authentication
- Email + password login
- Google OAuth login
- Profile fields: name, email, avatar, phone number

---

## Core Features

### Friends
- Add friends by email
- Split expenses directly with a friend (no group needed)
- Dashboard shows each friend with net balance (you owe / they owe you)

### Groups
- Create groups (e.g. "Trip to Vegas", "Roommates")
- Anyone in the group can add, edit, or delete expenses
- Equal power — no admin role
- Optional debt simplification toggle per group

### Expenses
- Can belong to a group OR be between friends directly
- Paid by one person
- Split among any participants using one of 4 modes:
  - **Equal** — split evenly
  - **Exact amounts** — specify how much each person owes
  - **Percentage** — specify % per person
  - **Itemized** — assign receipt line items to people
- Anyone can edit or delete an expense (audit trail kept)

### Receipts
- Linked to an expense
- Two ways to scan:
  1. **Upload** — user uploads an image directly from desktop
  2. **QR Code** — desktop shows a QR code, user scans with phone, phone camera opens, photo is taken and sent back to desktop in real time (via WebSockets)
- AI (Claude Vision API) extracts line items (name, quantity, price)
- User reviews and corrects extracted items
- Each item can be assigned to one or more people (shared items split equally among assignees)
- Tax and tip lines distributed proportionally

### Settlements
- Anyone can manually mark a debt as settled
- Settlement is logged in activity

### Debt Simplification
- Optional toggle per group (on/off)
- When on: minimizes number of transactions (e.g. A→B→C becomes A→C directly)

---

## Dashboard
- Net balance summary (total you owe vs total owed to you)
- Friends list with individual balances
- Groups list with net balance per group
- Recent activity feed across all groups and friends

---

## Notifications
- In-app notifications
- Email notifications
- Triggered when:
  - Someone adds an expense you're part of
  - Someone edits or deletes an expense you're part of
  - Someone settles up with you

---

## Audit Trail
- Every edit and delete on an expense is logged with before/after state
- Visible to all members of that group or expense

---

## Currency
- USD only (for now)

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Frontend       | React + TypeScript + Vite         |
| Styling        | Tailwind CSS (clean, minimal)     |
| Backend        | Python + FastAPI                  |
| ORM            | SQLAlchemy + Alembic (migrations) |
| Database       | PostgreSQL                        |
| AI / OCR       | Claude Vision API (Anthropic)     |
| Auth           | JWT + Google OAuth                |
| File Storage   | Cloudflare R2 (receipt images)    |
| Async Queue    | Celery + Redis                    |
| Real-time      | WebSockets (QR→camera→desktop)    |

---

## Database Tables (Overview)

| Table                     | Purpose                                          |
|---------------------------|--------------------------------------------------|
| users                     | User accounts and profiles                       |
| friendships               | Friend connections between users                 |
| groups                    | Expense groups                                   |
| group_members             | Which users belong to which group                |
| expenses                  | Individual expense records                       |
| expense_participants      | Who is involved in each expense + how much owed  |
| receipts                  | Receipt image metadata + OCR status              |
| receipt_items             | Line items extracted from a receipt              |
| receipt_item_assignments  | Which people are assigned to which receipt item  |
| settlements               | Records of debts being paid back                 |
| activity_log              | Audit trail of all changes                       |
| notifications             | In-app notification records                      |

---

## API Structure (Overview)

| Area         | Endpoints                                              |
|--------------|--------------------------------------------------------|
| Auth         | register, login, logout, google oauth, refresh token   |
| Users        | get profile, update profile                            |
| Friends      | list, add, remove, balances                            |
| Groups       | create, list, detail, update, delete, members          |
| Expenses     | create, list, detail, edit, delete                     |
| Receipts     | upload, generate QR, scan (OCR), review items, assign  |
| Settlements  | record, list                                           |
| Notifications| list, mark as read                                     |

---

## Receipt Scanning Flow (Detailed)

```
Desktop Web App                Phone                    Backend
      |                           |                         |
      |-- Click "Scan Receipt" -->|                         |
      |-- Generate QR code ------>|  (WebSocket session ID) |
      |                           |                         |
      |         User scans QR     |                         |
      |                           |-- Open mobile page ---->|
      |                           |-- Camera opens          |
      |                           |-- Take photo            |
      |                           |-- Upload image -------->|
      |                           |                         |-- Save to R2
      |                           |                         |-- Queue OCR job
      |<-- WebSocket: OCR done ---|-------------------------|
      |                           |                         |
      |-- Show extracted items    |                         |
      |-- User assigns items      |                         |
      |-- Create expense -------->|------------------------>|
```

---

## Build Order

### Stage 1 — Foundation
- Project structure, Docker (Postgres + Redis), environment config
- Database schema + Alembic migrations
- Auth: register, login, JWT, Google OAuth
- Basic React app with login/signup page

### Stage 2 — Friends & Groups
- Friends: add, remove, list with balances
- Groups: create, join, list members
- Dashboard shell

### Stage 3 — Expenses & Balances
- Add expenses (equal, exact, percentage splits)
- Balance computation
- Settle up
- Debt simplification toggle
- Activity feed + audit trail

### Stage 4 — Receipt Scanning
- Image upload flow
- QR code + WebSocket camera flow
- Claude Vision OCR integration (Celery worker)
- Item review + assignment UI
- Itemized expense creation

### Stage 5 — Notifications & Polish
- In-app + email notifications
- Mobile-responsive UI
- Error handling, empty states
- Final cleanup

---

*Last updated: 2026-03-26*
