require('dotenv').config();

// Brevo (formerly Sendinblue) transactional email API. Free tier: 300
// emails/day, and — unlike Resend's sandbox mode — it can send to ANY
// recipient once your single sender email is verified (no domain needed).
// Docs: https://developers.brevo.com/reference/sendtransacemail

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL; // must be verified in Brevo dashboard

async function sendOtpEmail(to, otp) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Trade Diary', email: SENDER_EMAIL },
      to: [{ email: to }],
      subject: 'Your Trade Diary verification code',
      htmlContent: `
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
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}

module.exports = { sendOtpEmail };
