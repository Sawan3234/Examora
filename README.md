# Examora
Examora is an AI-powered online exam proctoring platform built on the MERN stack (MongoDB, Express, React, Node.js) with Tailwind CSS for the frontend. It enables secure, remote exam delivery with automated integrity monitoring, aimed at institutions or organizations that need to run supervised assessments without in-person invigilation.

Core features:

1.Face verification — captures and stores facial descriptors during registration and verifies candidate identity before/during exams
2.Behavioral monitoring — tracks candidate activity throughout the exam session to detect suspicious behavior
3.Violation logging — records and timestamps integrity violations (e.g., tab-switching, face mismatches) for review
4.Role-based access control — separate flows for admins/organizations and students/candidates, with authenticated login and session management

Architecture:

.React + Tailwind + Vite frontend, maintained as a standalone repository
.Node/Express REST API backend with MongoDB (via Mongoose) for data persistence
.Collections for users, exams, sessions, and violations
.JWT-based authentication with bcrypt password hashing
