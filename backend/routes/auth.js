const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const { sendOtpEmail } = require('../mailer');
require('dotenv').config();

const router = express.Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing && existing.is_verified) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const otp = generateOtp();
  const expiresAt = otpExpiry();

  if (existing) {
    // Registered before but never verified -- refresh their details + send a new code.
    db.prepare('UPDATE users SET full_name = ?, password_hash = ?, otp_code = ?, otp_expires_at = ? WHERE id = ?')
      .run(full_name, password_hash, otp, expiresAt, existing.id);
  } else {
    db.prepare(
      'INSERT INTO users (full_name, email, password_hash, is_verified, otp_code, otp_expires_at) VALUES (?, ?, ?, 0, ?, ?)'
    ).run(full_name, email.toLowerCase(), password_hash, otp, expiresAt);
  }

  try {
    await sendOtpEmail(email.toLowerCase(), otp);
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    return res.status(500).json({ error: 'Could not send verification email. Please check the address and try again.' });
  }

  res.status(201).json({ needsVerification: true, email: email.toLowerCase() });
});

router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

  if (!user.otp_code || user.otp_code !== otp) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }
  if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  }

  db.prepare('UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?').run(user.id);

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email }
  });
});

router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

  const otp = generateOtp();
  const expiresAt = otpExpiry();
  db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?').run(otp, expiresAt, user.id);

  try {
    await sendOtpEmail(email.toLowerCase(), otp);
  } catch (err) {
    console.error('Failed to resend OTP email:', err.message);
    return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
  }

  res.json({ success: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_verified) {
    return res.status(403).json({
      error: 'Please verify your email before logging in',
      needsVerification: true,
      email: user.email
    });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email }
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
