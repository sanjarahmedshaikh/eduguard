# 🛡️ EduGuard — Secure Examination & Proctoring Platform

[![Live App](https://img.shields.io/badge/Live_App-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://eduguardsecure.netlify.app)
[![API Status](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://eduguard-2xfk.onrender.com)
[![Tech Stack](https://img.shields.io/badge/Stack-Node.js_|_Express_|_MongoDB_|_TailwindCSS-339933?style=for-the-badge)](https://nodejs.org)

> An intelligent, anti-cheat examination platform featuring real-time proctoring, dynamic question substitution upon focus violation, and comprehensive analytics for educators.

---

## ⚡ Quick Recruiter Demo Access

Experience the platform immediately without registration:

🌐 **Live Application**: [https://eduguardsecure.netlify.app](https://eduguardsecure.netlify.app)

| Role | User ID | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| **Teacher** | `demo_teacher` | `pass123` | Exam Builder, Penalty Pool Setup, Gradebook & Violation Audits |
| **Student** | `demo_student` | `pass123` | Anti-Cheat Exam Interface, Live Countdown, Instant Results |

> ℹ️ *Note: The backend is hosted on Render's free tier. If the service is waking up from idle, initial API requests may take ~30–45 seconds.*

---

## ✨ Core Features

### 1. 🛡️ Dynamic Anti-Cheat & Proctoring Engine
- **Focus & Tab Blur Detection**: Detects when a student switches tabs or minimizes the window.
- **Penalty Question Swapping**: When a violation is triggered, the system dynamically swaps the active question with a reserve penalty question from the database pool.
- **Violation Auditing**: Logs each swap attempt and persists `shuffleCount` into the student's submission record for teacher review.

### 2. 👨‍🏫 Teacher Administration Portal
- **Exam Management**: Create, publish, draft, or delete exams with custom durations, passing scores, and validity dates.
- **AI Prompt Generator**: Built-in ChatGPT prompt generator to speed up quiz and question authoring.
- **Performance Analytics**: Class average scores, total submissions, and detailed student answer reviews.

### 3. 🎓 Student Examination Experience
- **Timed Testing**: Clean interface with strict countdown timers and automated submission upon expiry.
- **Immediate Feedback**: Performance breakdown highlighting correct vs. incorrect answers and identifying substituted questions.

---

## 🛠️ Architecture & Tech Stack

```
EduGuard/
├── backend/            # Express.js REST API + MongoDB Mongoose models
│   ├── server.js       # App entry point, CORS config, routes & database logic
│   └── package.json    # Backend dependencies
└── frontend/           # Responsive client interface
    ├── index.html              # Authentication & role-based routing
    ├── teacher-dashboard.html  # Exam overview & management metrics
    ├── create-exam.html        # Question & penalty pool builder
    ├── teacher-results.html    # Detailed submission analytics
    ├── student-dashboard.html  # Available tests & test history
    ├── student-exam.html       # Proctoring & exam delivery interface
    └── student-results.html    # Student scorecard review
```

- **Frontend**: HTML5, Modern Vanilla JavaScript (ES6+), Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Security & Headers**: Helmet.js, Origin-restricted CORS policies
- **Hosting**: Netlify (Client), Render (API)

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Connection String (Local or MongoDB Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/sanjarahmedshaikh/eduguard.git
cd eduguard
```

### 2. Backend Configuration
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:
```env
PORT=5500
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/eduguard
```

Start the backend:
```bash
npm start
# Server runs on http://127.0.0.1:5500
```

### 3. Frontend Execution
You can serve the frontend with any static HTTP server or VS Code's **Live Server** extension:
```bash
# Using npx serve or Live Server:
cd ../frontend
npx serve .
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register new Teacher or Student account |
| `POST` | `/api/login` | Authenticate credentials and return user profile |
| `GET` | `/api/exams` | Fetch all published and draft exams |
| `POST` | `/api/exams` | Create or update an exam with penalty questions |
| `DELETE`| `/api/exams/:id` | Delete exam and associated submissions |
| `POST` | `/api/submit` | Grade and store student exam submission with violation logs |
| `GET` | `/api/submissions/:examId` | Retrieve all student submissions for a specific exam |

---

## 🗺️ Roadmap & Future Enhancements
- [ ] Migrate passwords to `bcryptjs` hashing with JSON Web Tokens (JWT) for stateless authentication.
- [ ] Centralize client-side API configuration to environment files.
- [ ] WebCam / Face-detection proctoring integration via TensorFlow.js.

---

## 👨‍💻 Author
**Sanjarahmed Shaikh**  
- GitHub: [@sanjarahmedshaikh](https://github.com/sanjarahmedshaikh)

