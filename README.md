# Examora v2.0 — AI-Powered Proctored Exam Platform

> **Secure online exams with KNN face verification, real-time proctoring, and violation detection.**

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-production%20ready-blue)
![Version](https://img.shields.io/badge/version-2.0-blueviolet)

---

## 🎯 Overview

Examora is a complete **MERN stack** proctoring platform that uses **KNN (k-Nearest Neighbors) face recognition** to verify student identity and detect cheating in real-time. Admins can create exams with multiple question types; students take exams with live camera monitoring; violations are logged and flagged automatically.

### Key Features

✨ **Smart Face Recognition**
- Register face once, verified on every exam
- Euclidean distance-based KNN matching
- Identity confidence scoring

🚨 **Real-Time Violation Detection**
- Multiple face detection
- Head pose tracking (yaw, pitch)
- Gaze direction monitoring
- Tab switch logging
- Auto-session flagging (5+ violations)

📊 **Admin Dashboard**
- Exam CRUD operations
- Live session monitoring
- Detailed violation reports
- Student performance analytics

🎓 **Student Experience**
- Clean, intuitive exam interface
- Question navigation (previous/next)
- Auto-saved answers
- Exam timer with auto-submit

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+ (local or Atlas)
- Modern browser with camera access

### 1. Clone & Install

```bash
# Clone repo
git clone https://github.com/yourusername/examora-v2
cd examora-v2

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI and JWT_SECRET

# Frontend setup (in another terminal)
cd ../frontend
npm install
cp .env.example .env
# .env should have VITE_API_URL=http://localhost:5000/api
```

### 2. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Runs on http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 3. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Complete API reference, architecture, deployment |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | File structure, file listing, improvements roadmap |
| [backend/README.md](./backend/README.md) | Backend setup, API routes, KNN algorithm |
| [frontend/README.md](./frontend/README.md) | Frontend setup, components, hooks, themes |

---

## 🏗️ Architecture

```
┌──────────────────┐
│   React + Vite   │  ← Modern, responsive UI
│   (frontend)     │     Dark theme, real-time
└────────┬─────────┘
         │ API (Axios)
         ↓
┌──────────────────┐
│ Node + Express   │  ← Clean, scalable backend
│ (backend)        │     JWT auth, role-based
└────────┬─────────┘
         │ ODM (Mongoose)
         ↓
┌──────────────────┐
│    MongoDB       │  ← Users, Exams, Sessions,
│    (database)    │     Violations, Descriptors
└──────────────────┘
```

### Tech Stack

**Backend:** Node.js • Express • MongoDB • Mongoose • JWT • bcryptjs

**Frontend:** React 18 • Vite • Tailwind • Zustand • face-api.js • Axios

**Proctoring:** face-api.js (TensorFlow.js) • Euclidean Distance (KNN) • Head Pose Analysis

---

## 🎬 Demo Workflow

### 1. Admin Creates Exam
```
Admin Dashboard
  → New Exam button
  → Fill: Title, Description, Type, Duration, Questions
  → Add Proctoring Rules
  → Save Exam
```

### 2. Student Registers Face
```
Student Login
  → Redirected to Face Registration
  → Captures face with webcam
  → face-api.js extracts 128-dim descriptor
  → Stored in database for KNN matching
```

### 3. Student Takes Exam
```
Available Exams
  → Click "Start Exam"
  → Camera starts, identity verified (KNN)
  → Live proctoring monitors:
     - Face presence
     - Head position
     - Eye gaze
     - Multiple faces
  → Violations logged in real-time
  → Submit answers
```

### 4. Admin Reviews Results
```
Admin Dashboard
  → View Sessions table
  → Click "Review" for flagged sessions
  → See violations with timestamps
  → Download report
```

---

## 🔐 Security Features

✅ **Authentication:** JWT tokens with configurable expiration  
✅ **Password Security:** bcryptjs hashing (salt rounds: 12)  
✅ **Face Privacy:** Descriptors stored, not images  
✅ **Role-Based Access:** Admin-only exam creation  
✅ **Input Validation:** Server-side validation on all endpoints  
✅ **CORS Protection:** Configured for production domains  

---

## 📊 KNN Proctoring Algorithm

### Face Registration (One-time)
```javascript
// User registers face
1. Extract face descriptor (128 floats) via face-api.js
2. Send to backend: POST /api/auth/register-face
3. Store in database: User.faceDescriptor
```

### During Exam (Every 4 seconds)
```javascript
// Real-time verification loop
1. Capture live descriptor
2. Calculate Euclidean distance:
   distance = √(Σ(stored[i] - live[i])²)
3. Match threshold: distance < 0.5 ✓
4. Analyze head pose & gaze
5. Log any violations
6. If violations > 5 → Flag session
```

### Violation Detection

| Detection | Threshold | Action |
|-----------|-----------|--------|
| Face mismatch | KNN distance > 0.5 | Log HIGH violation |
| Multiple faces | faceCount > 1 | Log HIGH violation |
| Head turn | Yaw > 30° | Log MEDIUM violation |
| Eyes off screen | Gaze deviation > 25° | Log MEDIUM violation |
| Face missing | faceCount = 0 | Log MEDIUM violation |
| Tab switch | Browser blur | Log MEDIUM violation |

---

## 📦 What's Included

### Backend
- ✅ Complete Express.js server
- ✅ MongoDB schemas (User, Exam, Session)
- ✅ JWT authentication
- ✅ KNN algorithm implementation
- ✅ Violation logging & analysis
- ✅ Admin & student role separation
- ✅ Error handling middleware

### Frontend
- ✅ React SPA with routing
- ✅ Dark mode UI (Tailwind)
- ✅ Face registration page
- ✅ Admin dashboard & exam manager
- ✅ Student exam room with proctoring overlay
- ✅ Real-time status indicators
- ✅ Responsive design

### Documentation
- ✅ Complete API reference
- ✅ Architecture diagrams
- ✅ Setup guides
- ✅ Deployment instructions
- ✅ Troubleshooting

---

## 🛠️ Development

### Running Tests

```bash
# Backend (with Jest)
cd backend
npm test

# Frontend (with Vitest)
cd frontend
npm test

# E2E tests (with Cypress)
npm run cypress
```

### Building for Production

```bash
# Backend: runs as-is
node backend/src/server.js

# Frontend
cd frontend
npm run build
# Upload dist/ to Vercel, Netlify, etc.
```

### Environment Variables

**Backend (.env):**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/examora
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:5000/api
```

---

## 📈 Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

1. **Backend:** Push to GitHub → Connect to Railway → Deploy
2. **Frontend:** Push to GitHub → Connect to Vercel → Deploy
3. **Database:** MongoDB Atlas (free tier)

### Option 2: Docker Compose

```bash
cd examora-v2
docker-compose up --build
```

### Option 3: Traditional VPS

```bash
# SSH into server
ssh user@your-server.com

# Clone repo, install, configure .env
npm install
pm2 start src/server.js

# Reverse proxy with Nginx
# Point domain to server IP
```

Full deployment guide: [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## 🐛 Troubleshooting

### Backend won't connect to MongoDB
```
Error: connect ECONNREFUSED 127.0.0.1:27017
→ Start MongoDB locally: mongod
→ OR use MongoDB Atlas connection string
```

### Frontend can't reach backend
```
→ Check VITE_API_URL in .env
→ Ensure backend running on :5000
→ Check CORS in backend/src/server.js
```

### Camera not working
```
→ Check browser has camera permissions
→ Use HTTPS in production (camera requires secure context)
→ Ensure face-api models loaded (browser DevTools)
```

See [DOCUMENTATION.md](./DOCUMENTATION.md#troubleshooting) for more.

---

## 📋 API Endpoints Summary

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `POST /api/auth/register-face` — Store face descriptor

### Exams
- `POST /api/exams` — Create exam (admin)
- `GET /api/exams` — List exams
- `GET /api/exams/:id` — Get exam
- `PUT /api/exams/:id` — Update exam (admin)
- `DELETE /api/exams/:id` — Delete exam (admin)

### Sessions
- `POST /api/sessions/start` — Start exam
- `GET /api/sessions` — List sessions
- `POST /api/sessions/:id/submit-answer` — Save answer
- `POST /api/sessions/:id/complete` — Submit exam

### Proctoring
- `POST /api/proctoring/verify` — Real-time KNN check
- `POST /api/proctoring/verify-identity` — One-time identity check
- `GET /api/proctoring/session/:id/violations` — View violations
- `POST /api/proctoring/tab-switch` — Log tab switch

Full API reference: [backend/README.md](./backend/README.md)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) (if exists) for guidelines.

---

## 📄 License

MIT License - Free for personal, educational, and commercial use.

See [LICENSE](./LICENSE) file for details.

---

## 📞 Support

- 📧 Email: support@examora.com
- 💬 GitHub Issues: [Link to issues]
- 📖 Documentation: [DOCUMENTATION.md](./DOCUMENTATION.md)
- 🐛 Bugs: Report in GitHub Issues

---

## 🎓 Educational Use

This project is perfect for:
- University online exams
- Certification tests
- Competitive exam proctoring
- Professional certifications
- Remote assessments

---

## 🚀 Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set up MongoDB backups
- [ ] Configure email notifications
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Test with real users
- [ ] Load testing (k6, Apache JMeter)
- [ ] Security audit
- [ ] Legal review (GDPR, data privacy)

---

## 🗺️ Roadmap

### v2.1 (Q2 2024)
- [ ] Email notifications
- [ ] Exam scheduling
- [ ] Bulk student import
- [ ] Advanced analytics

### v2.2 (Q3 2024)
- [ ] Mobile app (React Native)
- [ ] Video recording
- [ ] Gadget detection
- [ ] Audio proctoring

### v3.0 (Q4 2024)
- [ ] AI essay grading
- [ ] LMS integrations
- [ ] Multi-language support
- [ ] Accessibility improvements

---

## 🙏 Acknowledgments

- **face-api.js** team for excellent ML models
- **TensorFlow.js** for browser-based ML
- **MongoDB** for reliable database
- **Tailwind CSS** for beautiful design system

---

## ⭐ Show Your Support

If you find this project helpful, please star the repository! ⭐

```bash
git clone https://github.com/yourusername/examora-v2
cd examora-v2
# Star on GitHub!
```

---

**Made with ❤️ for secure, fair, and accessible online education.**

**Happy proctoring! 🎓**
