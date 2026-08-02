# Examora v2.0 — Complete Proctored Exam Platform

**AI-powered online exam proctoring with KNN face verification.**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [How KNN Proctoring Works](#how-knn-proctoring-works)
6. [API Reference](#api-reference)
7. [Violation Types & Scoring](#violation-types--scoring)
8. [Data Models](#data-models)
9. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXAMORA PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐              ┌──────────────────────┐     │
│  │  FRONTEND        │              │  BACKEND             │     │
│  │ (React + Vite)   │◄────API─────►│ (Node + Express)     │     │
│  │                  │              │                      │     │
│  │ • Landing        │              │ • Auth (JWT)         │     │
│  │ • Auth Pages     │              │ • Exams (CRUD)       │     │
│  │ • Face Reg       │              │ • Sessions           │     │
│  │ • Exam Room      │              │ • KNN Proctoring     │     │
│  │ • Dashboards     │              │ • Violation Logging  │     │
│  │                  │              │                      │     │
│  │ face-api.js:     │              │ MongoDB:             │     │
│  │ • Descriptor     │              │ • Users              │     │
│  │ • Head Pose      │              │ • Exams              │     │
│  │ • Gaze Analysis  │              │ • Sessions           │     │
│  │                  │              │ • Violations         │     │
│  └─────────────────┘              └──────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB (data storage)
- JWT (stateless auth)
- Euclidean distance (KNN matching)

**Frontend:**
- React 18 + Vite
- Tailwind CSS (styling)
- Zustand (state management)
- face-api.js (ML face detection + descriptor extraction)
- Axios (HTTP client)

---

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or Atlas)
- Git

### Clone & Setup

```bash
# Clone the repo
git clone <repo-url>
cd examora-v2

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET
npm run dev  # Backend on :5000

# In another terminal, setup frontend
cd frontend
npm install
cp .env.example .env
# .env should have VITE_API_URL=http://localhost:5000/api
npm run dev  # Frontend on :5173
```

Visit `http://localhost:5173` in your browser.

---

## Backend Setup

### 1. Environment Variables

Create `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/examora
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 2. MongoDB Connection

**Local:**
```bash
mongod  # Start MongoDB service
```

**Cloud (MongoDB Atlas):**
```
mongodb+srv://username:password@cluster.mongodb.net/examora?retryWrites=true&w=majority
```

### 3. Install & Run

```bash
cd backend
npm install
npm run dev
```

Server logs: `✅ MongoDB connected`, `🚀 Server running on port 5000`

### 4. Test API

```bash
# Health check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"test123"}'
```

---

## Frontend Setup

### 1. Environment Variables

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### 2. Install & Run

```bash
cd frontend
npm install
npm run dev
```

App loads at `http://localhost:5173`

### 3. Build for Production

```bash
npm run build
# Creates optimized `dist/` folder
# Deploy with: vercel, netlify, github pages, etc.
```

---

## How KNN Proctoring Works

### Phase 1: Face Registration

1. User goes to `/face-register`
2. Camera captures user's face
3. face-api.js extracts **128-dimensional face descriptor** (vector of floats)
4. Frontend sends to `POST /api/auth/register-face` with descriptor
5. Backend stores descriptor in `User.faceDescriptor`

### Phase 2: Exam Starts

1. Student clicks "Start Exam"
2. Camera stream begins
3. Backend starts **identity verification** (`/api/proctoring/verify-identity`)
4. Compares live descriptor with stored one using **Euclidean distance**
   - Distance < 0.5 → **Match** ✓ (proceed)
   - Distance ≥ 0.5 → **Mismatch** ✗ (violation logged, session flagged)

### Phase 3: Real-Time Monitoring (Every 4 seconds)

1. face-api.js extracts:
   - **Live descriptor** (128 floats)
   - **Head pose** (yaw, pitch, roll in degrees)
   - **Gaze angle** (x, y in degrees from center)
   - **Face count** (how many faces detected)

2. Frontend sends to `POST /api/proctoring/verify` with all data

3. Backend analyzes:
   ```
   if distance > 0.5:
       log "face_mismatch" violation (HIGH severity)
   
   if headpose.yaw > 30°:
       log "head_pose_violation" (MEDIUM severity)
   
   if gazeAngle.deviation > 25°:
       log "gaze_deviation" (MEDIUM/HIGH severity)
   
   if faceCount > 1:
       log "multiple_faces" (HIGH severity)
   
   if faceCount == 0:
       log "face_not_detected" (MEDIUM severity)
   
   if violations.HIGH > 5:
       session.status = "flagged"
   ```

4. Returns violation summary to frontend

5. Frontend UI updates:
   - Status indicators (green ✓ / red ✗)
   - Violation counter
   - Critical alerts if needed

### Phase 4: Exam Completion

1. Student clicks "Submit Exam"
2. All answers saved to backend
3. Session marked as `completed`
4. Admin can review violations & flagged sessions
5. Results available on dashboard

---

## API Reference

### Authentication

#### POST `/api/auth/register`
Register new student account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "faceDescriptor": null,
    "faceRegisteredAt": null
  }
}
```

---

#### POST `/api/auth/login`
Authenticate and get JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:** Same as register.

---

#### POST `/api/auth/register-face`
Register face descriptor for KNN matching.

**Headers:** `Authorization: Bearer <JWT>`

**Request:**
```json
{
  "faceDescriptor": [0.123, -0.456, ..., 0.789],  // 128 elements
  "faceImageUrl": null  // Optional: URL to stored face image
}
```

**Response:**
```json
{
  "message": "Face registered successfully",
  "faceRegisteredAt": "2024-04-22T10:30:00Z"
}
```

---

### Exams

#### POST `/api/exams`
Create new exam. **Admin only.**

**Request:**
```json
{
  "title": "Data Structures Final",
  "description": "Comprehensive exam on arrays, trees, graphs",
  "type": "multiple-choice",
  "duration": 120,
  "passingScore": 60,
  "scheduledAt": "2024-05-01T14:00:00Z",
  "generalInstructions": "No external resources allowed",
  "proctoringRules": [
    "Face must be visible at all times",
    "No tab switching allowed",
    "Camera must remain enabled"
  ],
  "questions": [
    {
      "text": "What is a binary search tree?",
      "type": "multiple-choice",
      "points": 10,
      "options": [
        { "id": 1, "text": "A tree where left < parent < right" },
        { "id": 2, "text": "A linked list with two pointers" }
      ],
      "correctOption": 1
    }
  ]
}
```

---

#### GET `/api/exams`
List exams. (Admin: their exams, Student: assigned to them)

---

#### POST `/api/sessions/start`
Create exam session.

**Request:**
```json
{
  "examId": "..."
}
```

**Response:**
```json
{
  "session": {
    "_id": "...",
    "exam": "...",
    "student": "...",
    "status": "in_progress",
    "startedAt": "2024-04-22T10:00:00Z",
    "violations": [],
    "answers": []
  }
}
```

---

#### POST `/api/proctoring/verify`
Real-time KNN verification & violation detection. **Called every 4 seconds.**

**Request:**
```json
{
  "liveDescriptor": [0.123, -0.456, ..., 0.789],  // 128 floats
  "headPose": { "yaw": 15.5, "pitch": -8.3, "roll": 0 },
  "gazeAngle": { "x": 5.2, "y": -3.1 },
  "faceCount": 1,
  "sessionId": "..."
}
```

**Response:**
```json
{
  "proctoringActive": true,
  "violationsLogged": 0,
  "totalViolations": 3,
  "sessionStatus": "in_progress",
  "identityVerified": true,
  "identityConfidence": 0.92
}
```

---

#### GET `/api/proctoring/session/:id/violations`
Admin: View all violations for a session.

**Response:**
```json
{
  "session": { ... },
  "violationSummary": {
    "total": 12,
    "high": 3,
    "medium": 7,
    "low": 2,
    "byType": {
      "face_mismatch": 2,
      "gaze_deviation": 5,
      "head_pose_violation": 5
    }
  },
  "violations": [
    {
      "type": "gaze_deviation",
      "severity": "medium",
      "timestamp": "2024-04-22T10:05:33Z",
      "metadata": { "gazeX": 28, "gazeY": -15, "deviation": 32.5 }
    },
    ...
  ]
}
```

---

## Violation Types & Scoring

| Type | Trigger | Severity | Points |
|------|---------|----------|--------|
| `face_not_detected` | No face in frame | Medium | 1 |
| `multiple_faces` | >1 face detected | High | 3 |
| `face_mismatch` | KNN distance > 0.5 | High | 3 |
| `gaze_deviation` | Eyes off screen >25° | Medium | 2 |
| `head_pose_violation` | Yaw >30° or pitch >25° | Medium/High | 2/3 |
| `tab_switch` | Browser loses focus | Medium | 1 |
| `gadget_detected` | Phone/tablet in frame | High | 3 |
| `fullscreen_exit` | Left fullscreen mode | Medium | 1 |

**Auto-flagging:** Session flagged if total violations **> 5 HIGH severity**.

---

## Data Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  role: 'admin' | 'student',
  faceDescriptor: [Number] (128 elements, null if not registered),
  faceRegisteredAt: Date | null,
  faceImageUrl: String | null,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Exam
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  type: 'writing' | 'multiple-choice' | 'coding',
  duration: Number (minutes),
  passingScore: Number (0-100),
  scheduledAt: Date,
  generalInstructions: String,
  proctoringRules: [String],
  questions: [{
    text: String,
    type: String,
    points: Number,
    options: [{ id, text }],
    correctOption: Number | null,
    testCases: [{ id, input, output }]
  }],
  createdBy: ObjectId (ref User),
  status: 'draft' | 'scheduled' | 'active' | 'completed',
  participants: [ObjectId] (ref User),
  createdAt: Date,
  updatedAt: Date
}
```

### Session
```javascript
{
  _id: ObjectId,
  exam: ObjectId (ref Exam),
  student: ObjectId (ref User),
  status: 'pending' | 'in_progress' | 'completed' | 'flagged' | 'terminated',
  startedAt: Date,
  completedAt: Date,
  answers: [{
    questionId: ObjectId,
    answer: String,
    submittedAt: Date
  }],
  violations: [{
    type: String,
    severity: 'low' | 'medium' | 'high',
    timestamp: Date,
    metadata: Object (e.g., { distance, gazeX, gazeY, yaw })
  }],
  score: Number | null,
  proctoringActive: Boolean,
  identityVerified: Boolean,
  identityConfidence: Number (0-1),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Deployment

### Option 1: Vercel (Frontend) + Railway/Render (Backend)

#### Deploy Backend to Render:
1. Push code to GitHub
2. Connect GitHub repo to [Render.com](https://render.com)
3. Create new Web Service
4. Set environment variables:
   - `MONGODB_URI` (from MongoDB Atlas)
   - `JWT_SECRET`
   - `CLIENT_URL` (your Vercel domain)
5. Deploy!

#### Deploy Frontend to Vercel:
1. Push code to GitHub
2. Connect GitHub repo to [Vercel](https://vercel.com)
3. Set environment variables:
   - `VITE_API_URL` (your Render backend URL)
4. Deploy!

### Option 2: Docker + Docker Compose

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
EXPOSE 5000
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongo:27017/examora
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "80:80"

volumes:
  mongo-data:
```

Run with: `docker-compose up --build`

---

## Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Use HTTPS (SSL certificates)
- [ ] Enable CORS properly (not `*`)
- [ ] Rate-limit API endpoints (prevent abuse)
- [ ] Validate all inputs server-side
- [ ] Hash passwords (bcryptjs already done)
- [ ] Use secure MongoDB Atlas credentials
- [ ] Enable MongoDB IP whitelist
- [ ] Set secure cookie flags
- [ ] Implement CSRF tokens if needed

---

## Troubleshooting

### Backend won't start
```
Error: connect ECONNREFUSED 127.0.0.1:27017
→ Start MongoDB: `mongod`

Error: JWT_SECRET is undefined
→ Check .env file, set JWT_SECRET
```

### Frontend can't connect to backend
```
→ Check VITE_API_URL in .env
→ Ensure backend is running on :5000
→ Check CORS headers in backend
```

### Camera not working
```
→ Browser must have camera permissions
→ Check `navigator.mediaDevices.getUserMedia` support
→ May require HTTPS in production
```

### KNN matching always fails
```
→ Ensure face is well-lit during registration
→ Check that descriptor has exactly 128 elements
→ Verify face-api models loaded (check browser console)
```

---

## Support & Contact

For issues, feature requests, or contributions:
- GitHub Issues: [link]
- Email: support@examora.com
- Documentation: [full docs link]

---

**Happy proctoring! 🎓**
