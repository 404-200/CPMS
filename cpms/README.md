# Candidate Performance Management and Analytics System

Full-stack system for uploading candidate score sheets, calculating
performance averages, and generating biweekly/monthly reports.

Stack: **React + Vite** (frontend) · **FastAPI + SQLAlchemy** (backend) ·
**PostgreSQL** (database) · **Docker Compose** (orchestration).

## What's implemented

- **Auth & RBAC**: JWT login/register, three roles (Admin, Manager, Viewer).
  Admin/Manager can manage candidates, periods, and uploads; Viewer is
  read-only. Only an Admin can overwrite an existing score sheet with a
  new version.
- **Candidate & stream management**: CRUD for candidates (soft delete —
  deactivation, not deletion, to preserve score history), 4 seeded
  streams (IT Support, Cloud Computing, Cyber Security, Software
  Development) with room to add more without a schema change.
- **Scoring periods**: biweekly and monthly periods, with overlap
  rejection for biweekly windows.
- **Excel upload pipeline**: validates file type/size, required columns,
  candidate existence, stream match, numeric scores in range 0-100,
  duplicate rows, and empty required values. Any row error fails the
  whole upload — nothing partial is ever saved (one DB transaction).
  Re-uploading to a period that already has scores is rejected unless
  `create_new_version=true` is set, and only an Admin can do that.
- **Calculations**: TDC average, Tech average, Overall average (all
  rounded to 2dp), monthly averages from the two biweekly results.
- **Rankings**: highest/lowest/median per period, with correct tie
  handling (competition ranking — ties share a rank).
- **Dashboard**: summary cards, stream comparison chart, ranking cards,
  results tables — for both biweekly and monthly views.
- **Tests**: 25 passing unit/integration tests covering calculations,
  rankings (including ties and even/odd median), and Excel validation
  (missing columns, invalid stream, unknown candidate, duplicates,
  invalid/out-of-range scores, empty values). Verified end-to-end against
  a live SQLite-backed API (register -> login -> RBAC -> candidates ->
  periods -> upload -> biweekly results -> monthly rollup -> dashboard).

## Project layout

```
cpms/
├── backend/
│   ├── app/
│   │   ├── core/         # config, database, security (JWT/bcrypt), deps (auth/RBAC)
│   │   ├── models/       # SQLAlchemy models: user, stream, candidate, scoring_period,
│   │   │                 # upload, score, result
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── routers/      # auth, candidates, streams, periods, uploads, results, dashboard
│   │   ├── services/     # excel_service, calculation_service, ranking_service, report_service
│   │   ├── scripts/      # seed.py - seeds streams + optional bootstrap admin
│   │   ├── tests/        # test_calculations, test_rankings, test_excel_upload, test_health
│   │   └── main.py
│   ├── alembic/          # migration 0001 creates the full schema
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/          # client.js + auth/candidates/periods/uploads/results/dashboard
│   │   ├── components/   # Navbar, Sidebar, CandidateTable, StreamChart, RankingCard, UploadForm
│   │   ├── pages/        # Login, Dashboard, Candidates, UploadScores, BiweeklyResults, MonthlyResults
│   │   ├── context/      # AuthContext (login/register/logout, session restore)
│   │   ├── App.jsx       # routing + protected layout
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── .env.example
```

## Running it

### 1. Set up environment files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `.env` and `backend/.env` so `POSTGRES_USER` / `POSTGRES_PASSWORD` /
`POSTGRES_DB` match in both files, and set a real `JWT_SECRET_KEY` in
`backend/.env`. `.env` files are gitignored — never commit them.

Optionally set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in
`backend/.env` to get a ready-made Admin account on first boot. If you
leave those blank, just register the first user from the login page —
new accounts default to Viewer, so promote your first real admin
directly in the database (`UPDATE users SET role='ADMIN' WHERE email=...`)
or set the seed vars and re-run the seed step.

### 2. Start everything with Docker Compose

```bash
docker compose up --build
```

This starts PostgreSQL, runs Alembic migrations and the seed script, then
starts the backend and frontend:

- Backend: `http://localhost:8000` (interactive docs at `/docs`)
- Frontend: `http://localhost:5173`

### 3. Running without Docker (optional)

Backend (needs a reachable Postgres instance, or point `DATABASE_URL` at
SQLite for a quick local spin):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## API reference

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Creates a Viewer by default; pass `role` to change |
| POST | `/api/auth/login` | Returns JWT + user |
| GET | `/api/auth/me` | Current user |
| GET | `/api/streams` | List streams |
| GET | `/api/candidates` | List candidates (`stream_id`, `active_only` filters) |
| POST | `/api/candidates` | Admin/Manager |
| PUT | `/api/candidates/{id}` | Admin/Manager |
| DELETE | `/api/candidates/{id}` | Admin only — soft delete (sets inactive) |
| GET | `/api/periods` | List periods (`period_type` filter) |
| POST | `/api/periods` | Admin/Manager — rejects overlapping biweekly windows |
| POST | `/api/uploads/scores` | Admin/Manager — multipart: `file`, `period_id`, `create_new_version` |
| GET | `/api/results/biweekly/{period_id}` | Results, stream averages, ranking summary |
| GET | `/api/results/monthly/{period_id}` | Monthly rollup (looked up by any period sharing that month/year) |
| GET | `/api/dashboard` | Summary cards for the latest biweekly period |
| GET | `/api/dashboard/streams` | Stream averages for the latest period |
| GET | `/api/dashboard/rankings` | Full ranking list for the latest period |

## Testing

```bash
cd backend
pytest app/tests/ -v
```

25 tests covering calculations, rankings (ties, even/odd median), and
Excel validation. All pass against an in-memory SQLite DB — no live
Postgres required to run the suite.

## Security notes

- Passwords hashed with bcrypt (via the `bcrypt` library directly — note:
  `passlib[bcrypt]` 1.7.4 is incompatible with `bcrypt>=4.1` and will
  raise spurious errors; this project avoids that dependency entirely).
- JWT auth on every route except register/login.
- Role-based access control enforced server-side on every write endpoint.
- File type restricted to `.xlsx`; upload size capped via `MAX_UPLOAD_SIZE_MB`.
- SQLAlchemy ORM (parameterized queries) throughout — no raw SQL string
  concatenation.
- Secrets loaded from environment variables only; `.env` files gitignored.
- CORS restricted to `CORS_ORIGINS` from settings.

## Known gaps / next steps

- No dedicated audit log table yet for tracking who edited what (spec
  item 18 — upload history exists via `score_sheet_uploads`, but a full
  audit trail for candidate edits etc. is not yet built).
- File storage is metadata-only (`storage_path` column ready for object
  storage; raw `.xlsx` files aren't currently persisted to disk/S3).
- No automated frontend component tests yet (backend has full test
  coverage; frontend was verified via `npm run build` and manual API
  integration).
- HTTPS/production deployment config (reverse proxy, TLS termination) is
  out of scope for local Docker Compose and would need to be added for a
  real deployment.
