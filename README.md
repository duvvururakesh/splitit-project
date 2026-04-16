# Splitit

An expense splitting web app — scan receipts, assign items to people, and see exactly who owes what.


## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Python + FastAPI |
| ORM | SQLAlchemy + Alembic |
| Database | PostgreSQL |
| AI / OCR | Gemini Vision API |
| Auth | JWT + Google OAuth |
| Storage | Cloudflare R2 |
| Queue | Celery + Redis |
| Real-time | WebSockets |

## Pages

```
/auth        Login / Sign up
/split       Bill Calculator (4-step wizard)
               Step 1 — Who's splitting?
               Step 2 — Upload receipts (single or multiple)
               Step 3 — Assign items to people
               Step 4 — Summary (who owes what)
/contacts    People & Groups
/activity    Saved splits history
/account     Profile & password
```

## Running locally

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs at `http://localhost:8000`

### Environment variables

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost/splitit
SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=...
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

### Database
```bash
cd backend
alembic upgrade head
```



## Project Structure

```
Splitit/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/          AuthPage
│   │   │   ├── Split/         BillSplitPage (main wizard)
│   │   │   ├── Contacts/      ContactsPage
│   │   │   ├── Activity/      ActivityPage
│   │   │   └── Account/       AccountPage
│   │   ├── components/
│   │   │   └── layout/        Sidebar, AppLayout
│   │   ├── utils/
│   │   │   ├── avatar.ts      Shared avatar color system
│   │   │   └── icons.tsx      Shared icon components (pencil, trash)
│   │   ├── api/               API client functions
│   │   └── store/             Zustand stores (auth, contacts)
│   └── index.html
├── backend/
│   ├── main.py
│   ├── models/
│   ├── routers/
│   └── alembic/
├── SYSTEM_DESIGN.md           Full system architecture doc
└── README.md
```
