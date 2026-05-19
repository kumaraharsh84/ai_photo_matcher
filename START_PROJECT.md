# Start Project Guide

Use PowerShell. Keep backend and frontend terminals open while testing.

## 1. Start Docker Desktop

Open Docker Desktop first and wait until it says it is running.

## 2. Start PostgreSQL

Terminal 1:

```powershell
cd photographer
docker compose up -d postgres
```

Check PostgreSQL is running:

```powershell
docker ps
```

You should see `photo_finder_postgres` or `photo_finder_postgres_demo`.

## 3. Start Backend

Terminal 2:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend URL:

```text
http://localhost:8010
```

Health check:

```text
http://localhost:8010/health
```

Expected S3 status:

```json
"storage_backend": "s3",
"s3_configured": true
```

## 4. Start Frontend

Terminal 3:

```powershell
cd frontend
npm.cmd run dev
```

Frontend URL:

```text
http://localhost:3000
```

## 5. Login And Test Photographer Flow

1. Open `http://localhost:3000`.
2. Click `Photographer Side`.
3. Login.
4. Create an event.
5. Add guest payment amount.
6. Upload a cover image.
7. Open the event manage page.
8. Upload event photos.
9. Wait for AI processing status.
10. Check AWS S3 bucket.

S3 folder:

```text
event-images/event_id/
```

## 6. Test Guest Flow

1. Go to `/user`.
2. Paste event link or scan/upload QR.
3. Open album.
4. Complete the payment step. If Razorpay keys are missing, the app uses demo payment mode for presentation.
5. Confirm Instagram follow.
6. Upload selfie or use camera.
7. View matching gallery.

Guest entry:

```text
http://localhost:3000/user
```

## 7. Common Problems

### Failed to fetch

Backend is not running. Start backend again:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

### Invalid email or password

The running database may be empty or different. Make sure the old database container is running if you need previous data.

### Port 5432 already allocated

This project uses PostgreSQL on host port `5433`. Run:

```powershell
cd photographer
docker compose up -d --force-recreate postgres
```

### S3 images not visible

Check backend health:

```text
http://localhost:8010/health
```

Make sure it shows:

```json
"storage_backend": "s3",
"s3_configured": true
```

Also confirm AWS bucket has objects inside:

```text
event-images/
```

## 8. Stop Project

Stop backend/frontend:

```powershell
Ctrl + C
```

Stop PostgreSQL:

```powershell
cd photographer
docker compose stop postgres
```
