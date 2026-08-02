# Examora Frontend - Modern React UI with Live Proctoring

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with backend API URL
```

### 3. Start development server
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Architecture

### Folder Structure
```
src/
├── pages/
│   ├── Landing.jsx              # Public landing page
│   ├── FaceRegistration.jsx     # Face capture + descriptor storage
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── admin/
│   │   ├── Dashboard.jsx        # Stats + recent sessions table
│   │   └── ExamList.jsx         # CRUD exams, create modal
│   └── student/
│       ├── Dashboard.jsx        # Available exams list
│       └── ExamRoom.jsx         # **Main exam + live proctoring overlay**
├── components/                  # Reusable UI components (future)
├── api/
│   ├── client.js               # Axios instance with auto-token injection
│   └── services.js             # API endpoints organized by domain
├── hooks/
│   └── useFaceApi.js           # face-api.js wrapper (capture, headpose, gaze)
├── store/
│   └── authStore.js            # Zustand auth store (login, register, registerFace)
├── App.jsx                     # Routes + protected route logic
├── main.jsx                    # React entry point
└── index.css                   # Tailwind + global styles
```

### State Management
- **Zustand** (`authStore.js`) for global auth state
- **React hooks** (useState) for page-level state
- **localStorage** for JWT token persistence

### API Integration
All API calls wrapped in `api/services.js`:
- `authAPI.register`, `authAPI.login`, `authAPI.registerFace`
- `examAPI.list`, `examAPI.create`, `examAPI.update`, `examAPI.delete`
- `sessionAPI.start`, `sessionAPI.submitAnswer`, `sessionAPI.complete`
- `proctoringAPI.verify`, `proctoringAPI.verifyIdentity`, `proctoringAPI.logTabSwitch`

---

## Key Pages

### 1. **Landing** (`Landing.jsx`)
- Hero section with animated gradients
- Feature cards (Face Recognition, Secure & Private, Real-Time Detection, Detailed Reports)
- CTA buttons → Login/Register

### 2. **Face Registration** (`FaceRegistration.jsx`)
- Camera stream from user's webcam
- Real-time face detection using face-api.js
- Validates:
  - Exactly 1 face detected
  - Good lighting
  - Face centered
- On success, sends descriptor vector to backend `/api/auth/register-face`

### 3. **Admin Dashboard** (`admin/Dashboard.jsx`)
- Stats cards: Total Sessions, In Progress, Completed, Flagged
- Sessions table with sortable columns
- Sidebar navigation
- Quick links to manage exams

### 4. **Admin Exam List** (`admin/ExamList.jsx`)
- Grid of exam cards
- Create/Edit/Delete modals
- Configure:
  - Title, Description, Type (writing/MC/coding)
  - Duration, Passing Score
  - Proctoring Rules (add/remove)
  - General Instructions

### 5. **Student Dashboard** (`student/Dashboard.jsx`)
- Shows all available exams
- Displays exam metadata (duration, questions, pass score)
- Warnings if face not registered
- "Start Exam" button → creates session, navigates to ExamRoom

### 6. **Exam Room** (`student/ExamRoom.jsx`) — **THE STAR**
This is where the magic happens:

#### Main Panel (left):
- Current question displayed
- Answer input (textarea for writing, radio buttons for MC)
- Previous/Next/Submit buttons
- Auto-saves answers to backend

#### Proctoring Sidebar (right):
- **Live camera feed** with face detection indicator
- **Status indicators:**
  - ✓ Identity Verified (KNN match passed)
  - ✓ Gaze OK (eyes on screen)
  - ✓ Head Pose OK (head centered)
- **Violations counter** (real-time)
- **Violation alerts** (yellow if 3+, red if critical)
- **Rules reminder** (summarized proctoring rules)

#### Real-Time Proctoring Loop (every 4 seconds):
1. Capture live face descriptor
2. Analyze head pose (yaw, pitch from landmarks)
3. Analyze gaze angle (eye position relative to face center)
4. Send to `/api/proctoring/verify` with face + pose + gaze
5. Backend returns:
   - Violations detected (type, severity)
   - Total violations count
   - Identity confidence
   - Session flagging if needed
6. Update UI with status indicators
7. Auto-submit exam if violations > 10 or time runs out

---

## Face-API Integration (`useFaceApi.js`)

### Models Used:
- **TinyFaceDetector** — fast face detection
- **FaceLandmark68Net** — 68 facial landmarks for head pose + gaze
- **FaceRecognitionNet** — 128-dim face descriptor (the KNN vector)

### Key Methods:
```javascript
captureDescriptor()     // Returns { descriptor, faceCount, landmarks }
analyzeHeadPose()       // Returns { yaw, pitch, roll } in degrees
analyzeGaze()           // Returns { x, y } gaze angles

// Usage:
const result = await captureDescriptor();
if (result.faceCount === 1) {
  const { descriptor } = result;
  // Send descriptor to backend for KNN matching
}
```

---

## Authentication Flow

1. **Register** → POST `/api/auth/register` → get JWT + user
2. **Store token** → localStorage
3. **API requests** → axios interceptor auto-injects `Authorization: Bearer <token>`
4. **Face register** → POST `/api/auth/register-face` with descriptor vector
5. **Protected routes** → redirect to /login if token missing

---

## UI Theme

- **Dark Mode** — slate-950 to slate-900 gradients
- **Accent Color** — Electric blue (`#3b82f6`)
- **Typography** — Syne (headings), Inter (body), Space Mono (code)
- **Animations** — Tailwind built-in (slide-up, fade-in, pulse-glow)

### CSS Variables Available:
```css
--electric: #3b82f6;
--neon: #00ff88;
```

---

## Deployment

1. **Build:**
   ```bash
   npm run build
   ```
   Creates `dist/` folder with optimized static files.

2. **Deploy to Vercel/Netlify:**
   - Connect GitHub repo
   - Set `VITE_API_URL` env variable to production backend URL
   - Deploy `dist/` folder

3. **Production Backend URL:**
   ```
   https://your-backend.com/api
   ```

---

## Known Limitations & Future Improvements

- [ ] Multi-answer support (save multiple descriptors per user)
- [ ] Gadget detection (phone/tablet in frame)
- [ ] Fullscreen enforcement (warn if user exits fullscreen)
- [ ] Screen recording (optional backend storage)
- [ ] Detailed violation history (for admin review)
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Internationalization (i18n) support
