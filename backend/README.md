# Examora Backend - KNN Proctored Exam System

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Start development server
```bash
npm run dev
```

The backend runs on `http://localhost:5000`.

---

## API Overview

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `GET /api/auth/me` — Current user (protected)
- `POST /api/auth/register-face` — Register face descriptor for KNN (protected)

### Users
- `GET /api/users/profile` — Get profile (protected)
- `PUT /api/users/profile` — Update profile (protected)
- `GET /api/users/face-status` — Check if face registered (protected)

### Exams (Admin)
- `POST /api/exams` — Create exam (admin only)
- `GET /api/exams` — List exams (admin: their exams, student: assigned to them)
- `GET /api/exams/:id` — Get exam details
- `PUT /api/exams/:id` — Update exam (admin only)
- `DELETE /api/exams/:id` — Delete exam (admin only)

### Sessions (Student)
- `POST /api/sessions/start` — Start exam session
- `GET /api/sessions` — List sessions
- `GET /api/sessions/:id` — Get session details
- `POST /api/sessions/:id/submit-answer` — Save answer
- `POST /api/sessions/:id/complete` — Mark exam as complete

### Proctoring (Real-time)
- `POST /api/proctoring/verify` — **Every 2-5 sec during exam** — sends face descriptor + head pose + gaze angles; server does KNN matching, logs violations
- `POST /api/proctoring/verify-identity` — One-time identity check at exam start
- `POST /api/proctoring/tab-switch` — Log when student switches browser tabs
- `GET /api/proctoring/session/:id/violations` — Admin: view all violations
- `POST /api/proctoring/session/:id/flag` — Admin: manually flag session

---

## KNN Proctoring Architecture

### Face Registration
1. Student goes to **Register Face** page
2. Frontend (face-api.js) captures webcam stream
3. Extracts 128-dimension face descriptor
4. Frontend sends to `POST /api/auth/register-face` with descriptor + photo
5. Server stores in MongoDB `User.faceDescriptor`

### During Exam
1. Student starts exam → camera starts
2. Every 2-5 seconds, frontend extracts live descriptor
3. Sends to `POST /api/proctoring/verify` with:
   - `liveDescriptor` [128 floats]
   - `headPose` {yaw, pitch, roll}
   - `gazeAngle` {x, y}
   - `faceCount` number
   - `sessionId` string
4. Backend does Euclidean distance (KNN k=1):
   - distance < 0.5 → **match** ✓
   - distance >= 0.5 → **mismatch** ✗ (face_mismatch violation)
5. Analyzes head pose + gaze → logs violations (head_pose_violation, gaze_deviation, etc.)
6. Session status auto-flags if 5+ high-severity violations

### Violations Table

| Type | Trigger | Severity | Auto-action |
|------|---------|----------|------------|
| `face_not_detected` | No face in frame | Medium | Warning |
| `multiple_faces` | >1 face detected | High | Warning + potential flag |
| `face_mismatch` | KNN distance >0.5 | High | Flag immediately |
| `gaze_deviation` | Eyes off screen >25° | Medium/High | Log |
| `head_pose_violation` | Head yaw >30°, pitch >25° | Medium/High | Log |
| `tab_switch` | Browser blur event | Medium | Log |
| `gadget_detected` | Phone/tablet detected | High | Flag |
| `fullscreen_exit` | Left fullscreen mode | Medium | Warning |

---

## Data Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'admin' | 'student',
  faceDescriptor: [Number] (128 elements, KNN vector),
  faceRegisteredAt: Date,
  faceImageUrl: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
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
    correctOption: Number,
    testCases: [{ id, input, output }],
  }],
  createdBy: ObjectId (ref User),
  status: 'draft' | 'scheduled' | 'active' | 'completed',
  participants: [ObjectId] (ref User),
  createdAt: Date,
  updatedAt: Date,
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
    submittedAt: Date,
  }],
  violations: [{
    type: String,
    severity: 'low' | 'medium' | 'high',
    timestamp: Date,
    metadata: Object,
  }],
  score: Number,
  proctoringActive: Boolean,
  identityVerified: Boolean,
  identityConfidence: Number (0-1),
  createdAt: Date,
  updatedAt: Date,
}
```

---

## JWT Auth Flow

1. Register or Login → server sends back JWT token
2. Client stores token in localStorage
3. For every protected request, include header:
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```
4. Server middleware extracts token, verifies signature, attaches user to request

---

## Deployment Notes

- Use environment variables: `MONGODB_URI`, `JWT_SECRET`, `PORT`
- For production, set `JWT_EXPIRES_IN` to something reasonable (e.g., "7d")
- CORS origin should match your frontend URL
- Consider rate-limiting proctoring endpoints to prevent abuse
- Face descriptors are NOT images — they're mathematical vectors, so PII is minimal
