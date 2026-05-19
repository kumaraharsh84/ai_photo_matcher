# AI Face-Based Wedding/Event Photo Finder

A full-stack AI photo finder for weddings and events. Photographers create event albums, upload images, and share an event link or QR code. Guests open the event, complete the payment and Instagram-follow flow, scan one selfie, and receive only their matching photos.

## Project Status

This project is prepared for an internship demo and GitHub presentation.

Completed:

- Photographer registration and login with JWT authentication
- Photographer dashboard, event creation, event management, and QR/share links
- AWS S3 image storage for cover images and event gallery photos
- Automatic face detection and embedding generation for uploaded event photos
- Guest event flow with payment, Instagram confirmation, selfie scan, and matching gallery
- Personalized gallery with preview and download support
- PostgreSQL database with event, photo, face, and payment session records
- Stability handling for failed uploads, failed AI processing, invalid selfies, and no-match results

Not included:

- Production deployment
- Cloud database hosting
- Redis, Celery, Kubernetes, CloudFront, or other scaling infrastructure

## Tech Stack

Frontend:

- Next.js
- React
- Tailwind CSS
- TypeScript

Backend:

- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT authentication

AI:

- InsightFace
- OpenCV
- NumPy
- ONNX Runtime

Storage and payments:

- AWS S3
- Razorpay test mode with demo fallback

## Main Workflow

Photographer side:

1. Photographer registers or logs in.
2. Photographer creates an event with cover image, Instagram username, and guest access amount.
3. Cover image is uploaded to S3.
4. Photographer uploads event photos.
5. Photos are uploaded to S3 under the event folder.
6. Backend automatically downloads each S3 image temporarily for AI processing.
7. InsightFace detects faces and creates embeddings.
8. Face embeddings, coordinates, confidence scores, photo IDs, and event IDs are saved in PostgreSQL.
9. Photographer shares the event link or QR code.

Guest side:

1. Guest opens the event link or scans/uploads QR from `/user`.
2. Guest completes the photographer-defined payment step. If Razorpay test keys are not configured, the app uses a clearly marked demo payment bypass for presentation.
3. Guest opens the Instagram link and confirms follow.
4. Guest uploads a selfie or uses the camera.
5. Backend validates that exactly one face exists in the selfie.
6. Guest face embedding is compared only against embeddings for the current event.
7. Matching photos are sorted by similarity and returned without duplicates.
8. Guest views and downloads matching photos.

## Requirements

- Windows PowerShell
- Python 3.11.x
- Node.js 20+
- Docker Desktop
- AWS S3 bucket
- Razorpay test account, optional for local demo because demo payment fallback is available

Python 3.11 is recommended because it is the most stable option for InsightFace, OpenCV, NumPy, and ONNX Runtime in this project.

## Environment Files

Never commit real `.env` files to GitHub.

Use these templates:

- `backend/.env.example`
- `frontend/.env.local.example`

Create local files from them:

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.local.example frontend\.env.local
```

## Backend Environment

Example `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/photo_finder
JWT_SECRET=change-this-secret-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads

STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name

RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

FACE_MATCH_THRESHOLD=0.45
SELFIE_MIN_FACE_CONFIDENCE=0.55
```

`STORAGE_BACKEND=auto` is also supported. In auto mode, the backend uses S3 when AWS variables are present and falls back to local uploads when they are missing.

## Frontend Environment

Example `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8010
```

## PostgreSQL Setup

Start Docker Desktop first.

Then run:

```powershell
cd photographer
docker compose up -d postgres
```

Database connection:

- Host: `localhost`
- Port: `5433`
- Database: `photo_finder`
- User: `postgres`
- Password: `postgres`

The container maps host port `5433` to container port `5432` to avoid conflicts with any existing local PostgreSQL installation.

## Backend Setup

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
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

Healthy demo response should include:

```json
{
  "status": "ok",
  "storage_backend": "s3",
  "s3_configured": true
}
```

If Razorpay keys are configured, `razorpay_configured` will be `true`. If it is `false`, the guest payment screen still works in demo mode.

## Frontend Setup

```powershell
cd frontend
npm install
npm.cmd run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Local Login

Create a photographer account from the register page after starting the frontend and backend.

For local demos, you can also create/reset a test account in your own PostgreSQL database. Do not commit real emails, passwords, or database dumps to GitHub.

## AWS S3 Setup

1. Create an S3 bucket.
2. Use the same bucket region in `AWS_REGION`.
3. Create an IAM user with S3 upload/read permission for the bucket.
4. Add the keys and bucket name to `backend/.env`.
5. For an internship demo, allow public read access for uploaded event images so the frontend can display S3 image URLs.

Demo-only public read bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadUploadedImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-s3-bucket-name/event-images/*"
    }
  ]
}
```

S3 object structure:

```text
event-images/
  event_id/
    cover-image.jpg
    photo-1.jpg
    photo-2.jpg
```

## Razorpay Test Mode And Demo Payment

The project supports two payment modes:

- Real Razorpay test checkout when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are configured.
- Demo payment bypass when Razorpay keys are missing, useful for internship presentation without blocking the guest flow.

The demo bypass is intentionally shown as a demo note on the payment page. It keeps the payment gate visible while making the project easy to present.

Real Razorpay setup:

1. Create or open a Razorpay test account.
2. Copy the test key ID and key secret.
3. Add them to `backend/.env`.
4. Restart the backend.
5. Check `http://localhost:8010/health`.

When configured correctly:

```json
"razorpay_configured": true
```

Use Razorpay test cards or UPI test options during the guest payment step.

## AI Processing Pipeline

Event photo processing:

```text
Upload image -> Save to S3 -> Create photo record -> Download temporary image -> OpenCV read -> InsightFace face detection -> Embedding generation -> Store face records -> Update processing status
```

Guest matching:

```text
Selfie upload -> Detect exactly one face -> Generate guest embedding -> Fetch faces for current event only -> Cosine similarity -> Apply threshold -> Remove duplicate photos -> Return best matches first
```

Important rules:

- The guest selfie is never compared against all events.
- Each detected face in a group photo is stored separately.
- One photo can appear only once in the final guest gallery.
- Corrupted or unreadable images are skipped safely.

## API Overview

System:

- `GET /health`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Photographer:

- `GET /dashboard`
- `POST /events`
- `GET /events`
- `GET /events/{event_id}`
- `POST /events/{event_id}/photos`
- `GET /events/{event_id}/photos`
- `GET /events/{event_id}/qr`
- `GET /events/{event_id}/processing-status`
- `GET /events/{event_id}/faces`
- `GET /events/{event_id}/faces/count`

Guest:

- `GET /public/events/{event_id}`
- `POST /public/events/{event_id}/payment/order`
- `POST /public/events/{event_id}/payment/verify`
- `POST /public/events/{event_id}/selfie-match`
- `GET /public/matches/{match_session_id}`
- `GET /public/photos/{photo_id}/download`

## Folder Structure

```text
backend/
  app/
    auth.py
    config.py
    database.py
    face_processing.py
    main.py
    matching.py
    models.py
    schemas.py
    storage.py
  uploads/
  requirements.txt
  .env.example

frontend/
  app/
    event/
    photographer/
    user/
  components/
  lib/
  package.json
  .env.local.example

docker-compose.yml
START_PROJECT.md
README.md
```

## Common Issues

Failed to fetch:

- Backend is not running.
- Check `http://localhost:8010/health`.
- Make sure `NEXT_PUBLIC_API_URL=http://localhost:8010`.

Login gets stuck:

- PostgreSQL is not running.
- Start Docker Desktop.
- Run `docker compose up -d postgres`.
- Confirm port `5433` is reachable.

Invalid email or password:

- The account does not exist in the current database, or the password is wrong.
- Register a new photographer account or reset the local demo account.

S3 bucket is empty:

- Existing old local images are not uploaded automatically unless migrated.
- New event cover images and event photos upload to S3 automatically when S3 is configured.

Face processing failed because `cv2` is missing:

- Activate the backend virtual environment.
- Run `pip install -r requirements.txt`.
- Use Python 3.11.

Razorpay health shows keys are not configured:

- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env`.
- Restart backend.
- Or continue with the built-in demo payment bypass for presentation.

## GitHub Safety Checklist

Before pushing:

- Confirm `.env` and `.env.local` are not committed.
- Confirm `backend/.venv/`, `frontend/node_modules/`, `frontend/.next/`, and uploaded images are not committed.
- Use `.env.example` files for configuration examples.
- Do not commit real AWS keys, Razorpay keys, JWT secrets, or database dumps.
- Keep screenshots/demo videos separate from secrets and customer images.

## Presentation Talking Points

- The project solves a real event-photography problem: guests can find their photos without manually browsing full albums.
- Photographer workflow is complete from album creation to AI indexing.
- Guest workflow is complete from event link to payment, follow confirmation, selfie scan, and matching gallery.
- Matching is event-scoped, which protects privacy and prevents cross-event photo leakage.
- S3 integration makes image storage cloud-ready while keeping the backend architecture beginner-friendly.
