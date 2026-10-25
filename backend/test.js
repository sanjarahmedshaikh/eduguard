const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Password hashing and comparison with bcryptjs', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await bcrypt.hash(rawPass, 10);
    assert.notEqual(rawPass, hash);
    const valid = await bcrypt.compare(rawPass, hash);
    assert.equal(valid, true);
    const invalid = await bcrypt.compare('WrongPassword', hash);
    assert.equal(invalid, false);
});

test('JWT signing and role verification', () => {
    const secret = 'test_secret_key_123';
    const payload = { id: 'teacher_1', role: 'teacher', name: 'Dr. Smith' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    assert.equal(decoded.id, 'teacher_1');
    assert.equal(decoded.role, 'teacher');
});

test('Scoring edge cases: non-empty questions compute correct percentage', () => {
    const questions = [
        { q: 'Q1', correctIndex: 1 },
        { q: 'Q2', correctIndex: 2 }
    ];
    const answers = [1, 0]; // 1 correct, 1 wrong
    let correct = 0;
    questions.forEach((q, i) => {
        if (answers[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    assert.equal(score, 50);
});

test('NoSQL operator sanitizer strips $ and . keys', () => {
    const body = {
        id: { $gt: '' },
        'nested.field': 'malicious',
        normalKey: 'safe'
    };

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

    sanitize(body);
    assert.equal(body.id.$gt, undefined);
    assert.equal(body['nested.field'], undefined);
    assert.equal(body.normalKey, 'safe');
});

