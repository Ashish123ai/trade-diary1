const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');
const auth = require('../middleware/auth');
const { sendOtpEmail } = require('../mailer');
require('dotenv').config();

const router = express.Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const emailLower = email.toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing && existing.is_verified) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const otp = generateOtp();
  const expiresAt = otpExpiry();

  if (existing) {
    existing.full_name = full_name;
    existing.password_hash = password_hash;
    existing.otp_code = otp;
    existing.otp_expires_at = expiresAt;
    await existing.save();
  } else {
    await User.create({
      full_name,
      email: emailLower,
      password_hash,
      is_verified: false,
      otp_code: otp,
      otp_expires_at: expiresAt
    });
  }

  try {
    await sendOtpEmail(emailLower, otp);
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    return res.status(500).json({ error: 'Could not send verification email. Please check the address and try again.' });
  }

  res.status(201).json({ needsVerification: true, email: emailLower });
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

  if (!user.otp_code || user.otp_code !== otp) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }
  if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  }

  user.is_verified = true;
  user.otp_code = null;
  user.otp_expires_at = null;
  await user.save();

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email }
  });
});

router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

  const otp = generateOtp();
  const expiresAt = otpExpiry();
  user.otp_code = otp;
  user.otp_expires_at = expiresAt;
  await user.save();

  try {
    await sendOtpEmail(email.toLowerCase(), otp);
  } catch (err) {
    console.error('Failed to resend OTP email:', err.message);
    return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
  }

  res.json({ success: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
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

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('full_name email created_at');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, created_at: user.created_at } });
});

module.exports = router;
