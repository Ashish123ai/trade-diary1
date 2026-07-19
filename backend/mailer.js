const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: `"Trade Diary" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your Trade Diary verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto;">
        <h2 style="color:#16a34a; margin-bottom: 4px;">Trade Diary</h2>
        <p style="color:#333;">Your verification code is:</p>
        <div style="font-size: 30px; font-weight: bold; letter-spacing: 8px; background:#f0fdf4; color:#15803d; padding: 14px 20px; border-radius: 10px; text-align:center;">
          ${otp}
        </div>
        <p style="color:#777; font-size: 13px; margin-top: 16px;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `
  });
}

module.exports = { sendOtpEmail };
