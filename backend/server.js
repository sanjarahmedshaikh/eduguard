// shortcut: Google DNS override required for local ISP resolving Atlas SRV records
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'eduguard_secure_jwt_secret_key_2026';

const app = express();
const port = process.env.PORT || 5500;

// Middleware
app.use(helmet());

const allowedOrigins = [
    'https://eduguardsecure.netlify.app',
    'https://www.eduguardsecure.netlify.app',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Blocked by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Prevent NoSQL Injection: recursively strip keys with $ or .
const sanitizeNoSql = (req, res, next) => {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
    };
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    next();
};
app.use(sanitizeNoSql);

// Rate limiting: Protect authentication routes against brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: "Too many attempts from this IP. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// MongoDB Connection
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

/* ============================
   DATABASE SCHEMAS
============================ */

const teacherSchema = new mongoose.Schema({
    teacherId: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true }
});

const studentSchema = new mongoose.Schema({
    studentId: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true }
});

const examSchema = new mongoose.Schema({
    title: String,
    topic: String,
    duration: Number,
    passGrade: Number,
    status: { type: String, enum: ['Published', 'Draft'], default: 'Draft' },
    validUntil: String,
    showExpiredToStudents: { type: Boolean, default: true },
    questions: [{
        q: String,
        options: [String],
        correctIndex: Number
    }],
    penaltyQuestions: [{
        q: String,
        options: [String],
        correctIndex: Number
    }],
    studentsCount: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 }
});

const submissionSchema = new mongoose.Schema({
    studentName: String,
    studentId: String,
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    score: Number,
    passed: Boolean,
    shuffleCount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    details: [{
        question: String,
        options: [String],
        studentAnswerIndex: Number,
        correctAnswerIndex: Number,
        isCorrect: Boolean,
        replaced: Boolean
    }]
});

const examSessionSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    shuffleCount: { type: Number, default: 0 },
    replacedIndices: [{ type: Number }],
    penaltyQuestionIndices: [{ type: Number }],
    isCompleted: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
const Student = mongoose.model('Student', studentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const ExamSession = mongoose.model('ExamSession', examSessionSchema);

/* ============================
   AUTHENTICATION & AUTHORIZATION MIDDLEWARE
============================ */

const verifyStudentSession = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role === 'student' && req.body.studentId && decoded.id !== req.body.studentId) {
                return res.status(403).json({ error: "Access denied. Token does not match student ID." });
            }
            req.user = decoded;
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
        }
    }
    next();
};

const requireTeacher = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Authentication required. Please log in as a teacher." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'teacher') {
            return res.status(403).json({ error: "Access forbidden. Teacher privileges required." });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
    }
};

/* ============================
   AUTHENTICATION ROUTES
============================ */

app.post('/api/register', async (req, res) => {
    try {
        const { role, id, password, name } = req.body;
        if (!role || !id || !password || !name) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (typeof role !== 'string' || typeof id !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
            return res.status(400).json({ error: "Invalid field format" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (role === 'teacher') {
            const existing = await Teacher.findOne({ teacherId: id });
            if (existing) return res.status(400).json({ error: 'Teacher ID already exists' });
            await new Teacher({ teacherId: id, password: hashedPassword, name }).save();
        } else if (role === 'student') {
            const existing = await Student.findOne({ studentId: id });
            if (existing) return res.status(400).json({ error: 'Student ID already exists' });
            await new Student({ studentId: id, password: hashedPassword, name }).save();
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { role, id, password } = req.body;
        if (!role || !id || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (typeof role !== 'string' || typeof id !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: "Invalid field format" });
        }

        let user;
        if (role === 'teacher') {
            user = await Teacher.findOne({ teacherId: id });
        } else if (role === 'student') {
            user = await Student.findOne({ studentId: id });
        }

        if (!user) return res.status(401).json({ error: 'Invalid ID or Password' });

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            isMatch = false;
        }

        // Backward compatibility: automatically migrate legacy plaintext accounts to bcrypt hash on successful login
        if (!isMatch && user.password === password) {
            isMatch = true;
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }

        if (!isMatch) return res.status(401).json({ error: 'Invalid ID or Password' });

        const token = jwt.sign(
            { id: role === 'teacher' ? user.teacherId : user.studentId, role, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: role === 'teacher' ? user.teacherId : user.studentId,
                name: user.name,
                role
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/* ============================
   EXAM SESSION & PROCTORING
============================ */

app.post('/api/exam-session/start', verifyStudentSession, async (req, res) => {
    try {
        const { studentId, studentName, examId } = req.body;
        if (!studentId || !examId) return res.status(400).json({ error: "Missing required fields" });
        if (typeof studentId !== 'string' || typeof examId !== 'string' || !mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: "Invalid field format or Exam ID" });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        if (exam.status !== 'Published') {
            return res.status(403).json({ error: "Exam is not open." });
        }
        if (exam.validUntil && new Date() > new Date(exam.validUntil)) {
            return res.status(403).json({ error: "This exam has expired." });
        }

        const existingSubmission = await Submission.findOne({ studentId, examId });
        if (existingSubmission) {
            return res.status(400).json({ error: "You have already completed this exam." });
        }

        let session = await ExamSession.findOne({ studentId, examId, isCompleted: false }).sort({ startedAt: -1 });
        if (!session) {
            session = await new ExamSession({
                studentId,
                studentName: typeof studentName === 'string' ? studentName : 'Student',
                examId,
                shuffleCount: 0
            }).save();
        }

        res.json({
            sessionId: session._id,
            shuffleCount: session.shuffleCount
        });
    } catch (error) {
        console.error("Failed to start/resume exam session:", error);
        res.status(500).json({ error: "Failed to initialize exam session" });
    }
});

app.post('/api/exam-session/violation', verifyStudentSession, async (req, res) => {
    try {
        const { studentId, examId, currentQ } = req.body;
        if (!studentId || !examId) return res.status(400).json({ error: "Missing required fields" });
        if (typeof studentId !== 'string' || typeof examId !== 'string' || !mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: "Invalid field format or Exam ID" });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        let session = await ExamSession.findOne({ studentId, examId, isCompleted: false }).sort({ startedAt: -1 });
        if (!session) {
            session = new ExamSession({ studentId, studentName: 'Student', examId, shuffleCount: 0 });
        }

        session.shuffleCount += 1;
        if (typeof currentQ === 'number') {
            session.replacedIndices.push(currentQ);
        }

        let penaltyQuestion = null;
        if (exam.penaltyQuestions && exam.penaltyQuestions.length > 0) {
            const pIndex = (session.shuffleCount - 1) % exam.penaltyQuestions.length;
            session.penaltyQuestionIndices.push(pIndex);
            const rawPenalty = exam.penaltyQuestions[pIndex];
            penaltyQuestion = {
                q: rawPenalty.q,
                options: rawPenalty.options,
                replaced: true
            };
        }

        await session.save();

        res.json({
            shuffleCount: session.shuffleCount,
            penaltyQuestion,
            terminated: session.shuffleCount > 3
        });
    } catch (error) {
        console.error("Violation logging error:", error);
        res.status(500).json({ error: "Failed to record violation" });
    }
});

/* ============================
   EXAM MANAGEMENT
============================ */

app.get('/api/exams', async (req, res) => {
    try {
        let isTeacher = false;
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.role === 'teacher') isTeacher = true;
            } catch (e) {}
        }

        const exams = await Exam.find();

        const responseExams = exams.map(e => {
            const examObj = { ...e.toObject(), id: e._id };

            // Strip correct answers unless the request is for a teacher
            if (!isTeacher) {
                if (Array.isArray(examObj.questions)) {
                    examObj.questions = examObj.questions.map(({ correctIndex, ...rest }) => rest);
                }
                if (Array.isArray(examObj.penaltyQuestions)) {
                    examObj.penaltyQuestions = examObj.penaltyQuestions.map(({ correctIndex, ...rest }) => rest);
                }
            }

            return examObj;
        });

        res.json(responseExams);
    } catch (error) {
        console.error("Failed to fetch exams:", error);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
});

app.post('/api/exams', requireTeacher, async (req, res) => {
    try {
        const examData = req.body;
        const targetId = examData.id || examData._id;
        if (targetId && !mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({ error: "Invalid Exam ID" });
        }
        const exam = targetId
            ? await Exam.findByIdAndUpdate(targetId, examData, { returnDocument: 'after' })
            : await new Exam(examData).save();
        res.json({ ...exam.toObject(), id: exam._id });
    } catch (error) {
        console.error("Failed to save exam:", error);
        res.status(500).json({ error: "Failed to save exam" });
    }
});

app.delete('/api/exams/:id', requireTeacher, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Exam ID" });
        }
        await Exam.findByIdAndDelete(req.params.id);
        await Submission.deleteMany({ examId: req.params.id });
        await ExamSession.deleteMany({ examId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete exam:", error);
        res.status(500).json({ error: "Failed to delete exam" });
    }
});

app.post('/api/submit', verifyStudentSession, async (req, res) => {
    try {
        const { studentName, studentId, examId, answers, sessionQuestions, shuffleCount } = req.body;
        if (typeof studentId !== 'string' || typeof examId !== 'string' || !mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: "Invalid field format or Exam ID" });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        // Enforce published status and expiration deadline
        if (exam.status !== 'Published') {
            return res.status(403).json({ error: "This assessment is not open for submission." });
        }
        if (exam.validUntil && new Date() > new Date(exam.validUntil)) {
            return res.status(403).json({ error: "This exam deadline has already passed." });
        }

        // Prevent duplicate exam submissions
        const existingSubmission = await Submission.findOne({ studentId, examId });
        if (existingSubmission) {
            return res.status(400).json({ error: "You have already completed and submitted this assessment." });
        }

        // Retrieve server-side session to verify true shuffle count and prevent client tampering
        const session = await ExamSession.findOne({ studentId, examId, isCompleted: false }).sort({ startedAt: -1 });
        const authoritativeShuffleCount = session ? session.shuffleCount : (shuffleCount || 0);

        const questionsToGrade = sessionQuestions || exam.questions;
        if (!questionsToGrade || !questionsToGrade.length) {
            return res.status(400).json({ error: "Cannot submit an exam with no questions" });
        }

        let correct = 0;
        const details = questionsToGrade.map((q, i) => {
            // Authoritative server-side answer resolution: match strictly against MongoDB records
            let realCorrectIndex;
            const normalQ = exam.questions.find(eq => eq.q === q.q);
            if (normalQ) {
                realCorrectIndex = normalQ.correctIndex;
            } else if (exam.penaltyQuestions) {
                const penaltyQ = exam.penaltyQuestions.find(pq => pq.q === q.q);
                if (penaltyQ) {
                    realCorrectIndex = penaltyQ.correctIndex;
                }
            }
            if (realCorrectIndex === undefined && exam.questions[i]) {
                realCorrectIndex = exam.questions[i].correctIndex;
            }

            // Extract student answer safely
            const rawStudentAns = answers && answers[i] !== undefined ? answers[i] : (answers && answers[String(i)]);
            const studentAns = rawStudentAns !== undefined && rawStudentAns !== null && rawStudentAns !== ''
                ? Number(rawStudentAns)
                : -1;

            const isCorrect = studentAns >= 0 && studentAns === realCorrectIndex;
            if (isCorrect) correct++;

            return {
                question: q.q,
                options: q.options,
                studentAnswerIndex: studentAns,
                correctAnswerIndex: realCorrectIndex,
                isCorrect,
                replaced: q.replaced || false
            };
        });

        const score = Math.round((correct / questionsToGrade.length) * 100);
        const submission = await new Submission({
            studentName: typeof studentName === 'string' ? studentName : 'Student',
            studentId,
            examId,
            score,
            passed: score >= exam.passGrade,
            details,
            shuffleCount: authoritativeShuffleCount
        }).save();

        if (session) {
            session.isCompleted = true;
            await session.save();
        }

        // Atomic aggregate calculation: prevents concurrent submission race conditions
        await Exam.findByIdAndUpdate(examId, [
            {
                $set: {
                    avgScore: {
                        $round: [
                            {
                                $divide: [
                                    { $add: [{ $multiply: [{ $ifNull: ["$avgScore", 0] }, { $ifNull: ["$studentsCount", 0] }] }, score] },
                                    { $add: [{ $ifNull: ["$studentsCount", 0] }, 1] }
                                ]
                            },
                            0
                        ]
                    },
                    studentsCount: { $add: [{ $ifNull: ["$studentsCount", 0] }, 1] }
                }
            }
        ]);

        res.json(submission);
    } catch (error) {
        console.error("Failed to submit exam:", error);
        res.status(500).json({ error: "Failed to submit exam" });
    }
});

app.get('/api/submissions/:examId', requireTeacher, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.examId)) {
            return res.status(400).json({ error: "Invalid Exam ID" });
        }
        res.json(await Submission.find({ examId: req.params.examId }));
    } catch (error) {
        console.error("Failed to fetch submissions:", error);
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
});

app.listen(port, '0.0.0.0', () => console.log(`🚀 Backend running at http://127.0.0.1:${port}`));
