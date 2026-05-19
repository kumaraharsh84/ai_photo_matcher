# GitHub Ready Checklist

Use this before uploading or presenting the project.

## 1. Do Not Upload Secrets

Do not commit these files:

- `backend/.env`
- `frontend/.env.local`
- AWS keys
- Razorpay keys
- JWT secrets
- Database dumps
- Real guest/customer photos

Only commit:

- `backend/.env.example`
- `frontend/.env.local.example`

## 2. Clean Local Generated Files

These should stay ignored:

- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/.next/`
- `backend/uploads/`
- `backend/vendor-src/`
- `postgres_data/`

## 3. Check The App Before Demo

Start PostgreSQL:

```powershell
cd photographer
docker compose up -d postgres
```

Start backend:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Start frontend:

```powershell
cd frontend
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:8010/health
```

## 4. Demo Flow To Show

1. Photographer login.
2. Create event with cover image, Instagram username, and payment amount.
3. Upload event photos.
4. Show automatic AI processing status.
5. Copy/share event link or QR code.
6. Open guest flow.
7. Complete Razorpay test payment, or use demo payment mode if keys are not configured.
8. Confirm Instagram follow.
9. Upload selfie.
10. Show matched gallery and download photos.

## 5. Git Commands

If this folder is not already a Git repository:

```powershell
git init
git add .
git status
git commit -m "Prepare AI wedding photo finder demo"
```

Before pushing, carefully check `git status` and make sure no real `.env` files or uploaded images are included.
