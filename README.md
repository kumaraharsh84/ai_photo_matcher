# AI Photo Matcher

AI Photo Matcher is a full-stack wedding and event photo finder. Photographers can create event albums, upload photos, and share an event link or QR code. Guests can open the event, complete the access flow, upload one selfie, and receive only the photos where their face is matched.

## Project Overview

This project is built for an internship-level demo and focuses on a complete end-to-end AI photo matching workflow.

Main idea:

```text
Photographer uploads event photos
AI detects and indexes faces
Guest uploads selfie
AI matches selfie with event photos
Guest receives a personalized gallery
```

## Team Contributions

**Hiren Madhia**  
Worked on the frontend and UI/UX part of the project, including the landing page, photographer dashboard, event pages, guest flow pages, responsive layouts, loading states, gallery UI, and visual polishing.

**Utkarsh Batham**  
Worked on backend development and system integration, including FastAPI APIs, PostgreSQL setup, authentication, event management APIs, image upload handling, AWS S3 storage integration, QR code generation, and payment flow support.

**Harsh Kumar**  
Worked on the AI/ML face processing pipeline, including InsightFace setup, face detection, embedding generation, storing face data, guest selfie validation, cosine similarity matching, and personalized photo result generation.

## Features

Photographer side:

- Photographer registration and login
- JWT-based protected dashboard
- Create event albums
- Upload event cover image
- Upload multiple event photos
- AWS S3 storage for uploaded images
- QR code generation for event sharing
- Event-wise image management
- Automatic AI face processing after upload
- Face detection preview and processing status

Guest side:

- Open event by link or QR flow
- Payment gate with Razorpay test mode support
- Demo payment fallback when Razorpay keys are not configured
- Instagram follow confirmation step
- Upload selfie or use camera
- Selfie face validation
- AI face matching against the current event only
- Personalized matching photo gallery
- Single image download
- ZIP download for multiple selected images

AI system:

- Face detection using InsightFace
- Image reading with OpenCV
- Face embedding generation
- Cosine similarity matching
- Multiple faces supported in event photos
- Exactly one face required in guest selfie
- Duplicate gallery photos prevented
- Failed/corrupted images handled safely

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS

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

Storage and payment:

- AWS S3
- Razorpay test mode
- Demo payment fallback for presentation

## Project Workflow

### Photographer Flow

1. Photographer registers or logs in.
2. Photographer creates an event with event details, cover image, Instagram username, and access amount.
3. Cover image is uploaded to AWS S3.
4. Photographer uploads event photos.
5. Photos are stored in S3 under the event folder.
6. Backend automatically processes each image.
7. InsightFace detects all faces in each uploaded image.
8. Face embeddings, coordinates, confidence score, event ID, and photo ID are stored in PostgreSQL.
9. Photographer shares the event link or QR code with guests.

### Guest Flow

1. Guest opens the event link or QR flow.
2. Guest completes payment. If Razorpay keys are missing, demo payment mode is used.
3. Guest opens the Instagram link and confirms follow.
4. Guest uploads a selfie or uses the camera.
5. Backend validates that the selfie contains exactly one face.
6. Guest face embedding is compared only with embeddings from the current event.
7. Matching photos are sorted by similarity.
8. Duplicate photos are removed.
9. Guest views and downloads matched photos.

## AI Matching Pipeline

Event photo processing:

```text
Upload image
-> Store in S3
-> Create photo record
-> Download temporary image for AI
-> Read image using OpenCV
-> Detect faces using InsightFace
-> Generate embeddings
-> Store face records in PostgreSQL
-> Update processing status
```

Guest selfie matching:

```text
Upload selfie
-> Detect exactly one face
-> Generate guest embedding
-> Fetch event-specific face embeddings
-> Calculate cosine similarity
-> Apply threshold
-> Remove duplicate photos
-> Return best matches first
```

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
GITHUB_READY_CHECKLIST.md
README.md
```

## Requirements

- Python 3.11.x
- Node.js 20+
- Docker Desktop
- PostgreSQL through Docker
- AWS S3 bucket
- Razorpay test account, optional for demo mode

Python 3.11 is recommended for best compatibility with InsightFace, OpenCV, NumPy, and ONNX Runtime.

## Environment Setup

Do not commit real environment files.

Create backend environment file:

```powershell
copy backend\.env.example backend\.env
```

Create frontend environment file:

```powershell
copy frontend\.env.local.example frontend\.env.local
```

Backend `.env` example:

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

Frontend `.env.local` example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8010
```

## Run The Project

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Start backend:

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Start frontend:

```powershell
cd frontend
npm install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:8010/health
```

## AWS S3 Setup

1. Create an AWS S3 bucket.
2. Add the bucket name and AWS credentials in `backend/.env`.
3. Uploaded event images are stored under:

```text
event-images/event_id/
```

For demo image display, S3 objects should be readable by the frontend. Use restricted IAM credentials and never commit real AWS keys.

## Payment Mode

The project supports:

- Real Razorpay test checkout when keys are configured
- Demo payment bypass when Razorpay keys are missing

This keeps the payment step visible during presentation while allowing the full guest flow to be tested without real payment credentials.

## API Overview

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

Guest:

- `GET /public/events/{event_id}`
- `POST /public/events/{event_id}/payment/order`
- `POST /public/events/{event_id}/payment/verify`
- `POST /public/events/{event_id}/selfie-match`
- `GET /public/matches/{match_session_id}`
- `GET /public/photos/{photo_id}/download`
- `GET /public/matches/{match_session_id}/download-zip`

System:

- `GET /health`

## Demo Checklist

1. Start PostgreSQL, backend, and frontend.
2. Register or log in as photographer.
3. Create an event.
4. Upload event cover image.
5. Upload event photos.
6. Wait for AI processing.
7. Open the event share link or QR flow.
8. Complete demo payment or Razorpay test payment.
9. Confirm Instagram follow.
10. Upload one clear selfie.
11. View matched gallery.
12. Download one image or multiple images as ZIP.

## GitHub Safety

This repository is configured to ignore:

- Real `.env` files
- Virtual environments
- Node modules
- Next.js build output
- Uploaded images
- Temporary guest selfies
- Generated vendor/build files

Do not commit:

- Real AWS keys
- Razorpay keys
- JWT secrets
- Database dumps
- Real customer or guest photos

## Presentation Points

- Solves a real event-photography problem.
- Photographer can upload photos once and let AI index faces automatically.
- Guests do not need to manually browse the full album.
- Matching is limited to the current event for privacy.
- S3 storage makes uploaded images cloud-ready.
- Demo payment mode keeps the workflow presentation-friendly.
