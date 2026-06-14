const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Use built-in fetch if Node 18+, otherwise fallback to node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const port = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());

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
    showExpiredToStudents: { type: Boolean, default: true }, // FIX: Added visibility control to Schema so it actually saves!
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

const Teacher = mongoose.model('Teacher', teacherSchema);
const Student = mongoose.model('Student', studentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Submission = mongoose.model('Submission', submissionSchema);

/* ============================
   AUTHENTICATION ROUTES
============================ */

app.post('/api/register', async (req, res) => {
    try {
        const { role, id, password, name } = req.body;
        if (!role || !id || !password || !name) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (role === 'teacher') {
            const existing = await Teacher.findOne({ teacherId: id });
            if (existing) return res.status(400).json({ error: 'Teacher ID already exists' });
            await new Teacher({ teacherId: id, password, name }).save();
        } else if (role === 'student') {
            const existing = await Student.findOne({ studentId: id });
            if (existing) return res.status(400).json({ error: 'Student ID already exists' });
            await new Student({ studentId: id, password, name }).save();
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

        let user;
        if (role === 'teacher') {
            user = await Teacher.findOne({ teacherId: id, password });
        } else if (role === 'student') {
            user = await Student.findOne({ studentId: id, password });
        }

        if (!user) return res.status(401).json({ error: 'Invalid ID or Password' });

        res.json({
            success: true,
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
   EXAM MANAGEMENT
============================ */

app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.find();
        res.json(exams.map(e => ({ ...e.toObject(), id: e._id })));
    } catch (error) {
        console.error("Failed to fetch exams:", error);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
});

app.post('/api/exams', async (req, res) => {
    try {
        const examData = req.body;
        const exam = examData.id || examData._id
            ? await Exam.findByIdAndUpdate(examData.id || examData._id, examData, { returnDocument: 'after' })
            : await new Exam(examData).save();
        res.json({ ...exam.toObject(), id: exam._id });
    } catch (error) {
        console.error("Failed to save exam:", error);
        res.status(500).json({ error: "Failed to save exam" });
    }
});

app.delete('/api/exams/:id', async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        await Submission.deleteMany({ examId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete exam:", error);
        res.status(500).json({ error: "Failed to delete exam" });
    }
});

app.post('/api/submit', async (req, res) => {
    try {
        const { studentName, studentId, examId, answers, sessionQuestions, shuffleCount } = req.body;
        const exam = await Exam.findById(examId);

        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const questionsToGrade = sessionQuestions || exam.questions;

        let correct = 0;
        const details = questionsToGrade.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            if (isCorrect) correct++;
            return {
                question: q.q,
                options: q.options,
                studentAnswerIndex: answers[i],
                correctAnswerIndex: q.correctIndex,
                isCorrect,
                replaced: q.replaced || false
            };
        });

        const score = Math.round((correct / questionsToGrade.length) * 100);
        const submission = await new Submission({
            studentName, studentId, examId, score,
            passed: score >= exam.passGrade, details,
            shuffleCount: shuffleCount || 0
        }).save();

        exam.studentsCount++;
        exam.avgScore = Math.round(((exam.avgScore * (exam.studentsCount - 1)) + score) / exam.studentsCount);
        await exam.save();

        res.json(submission);
    } catch (error) {
        console.error("Failed to submit exam:", error);
        res.status(500).json({ error: "Failed to submit exam" });
    }
});

app.get('/api/submissions/:examId', async (req, res) => {
    try {
        res.json(await Submission.find({ examId: req.params.examId }));
    } catch (error) {
        console.error("Failed to fetch submissions:", error);
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
});

app.listen(port, '0.0.0.0', () => console.log(`🚀 Backend running at http://127.0.0.1:${port}`));