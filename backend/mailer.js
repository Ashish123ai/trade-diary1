const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Without a verified domain on Resend, emails can only be delivered to the
// address you signed up to Resend with (sandbox mode). Once you verify your
// own domain in the Resend dashboard, change RESEND_FROM below to something
// like "Trade Diary <otp@yourdomain.com>" and any user's email will work.
const FROM = process.env.RESEND_FROM || 'Trade Diary <onboarding@resend.dev>';

async function sendOtpEmail(to, otp) {
  const { error } = await resend.emails.send({
    from: FROM,
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

  if (error) {
    throw new Error(error.message || 'Failed to send email via Resend');
  }
}

module.exports = { sendOtpEmail };
