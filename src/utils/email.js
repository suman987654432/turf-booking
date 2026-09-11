const nodemailer = require('nodemailer');

/**
 * Create reusable Nodemailer SMTP Transporter
 */
const createTransporter = () => {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  
  if (user && pass) {
    const isSecure = port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      family: 4, // Force IPv4 to prevent ENETUNREACH on Render
    });
  }
  return null;
};

/**
 * Send Verification Email via Nodemailer SMTP
 */
const sendVerificationEmail = async (toEmail, code) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #10b981; padding: 36px 25px;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">
                TURF BOOKING
              </div>
              <div style="margin-top: 7px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #d1fae5; text-transform: uppercase;">
                Account Verification
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td align="center" style="padding: 40px 30px;">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
                Verify Your Account
              </div>
              <div style="font-size: 14px; line-height: 1.7; color: #475569; margin-bottom: 28px;">
                Thank you for joining Turf Booking! Use the verification code below to complete your registration.
              </div>
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 2px dashed #34d399; border-radius: 16px;">
                <tr>
                  <td align="center" style="padding: 20px 15px;">
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #059669; text-transform: uppercase; margin-bottom: 8px;">
                      Your Verification Code
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10b981; padding-left: 8px;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Expiry -->
              <div style="margin-top: 20px; font-size: 13px; color: #64748b; line-height: 1.6;">
                This verification code will expire in <strong style="color: #334155;">15 minutes</strong>.
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 22px 25px;">
              <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} Turf Booking. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = createTransporter();
  
  if (transporter) {
    try {
      let rawEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@turfbooking.com').trim();
      // Ensure we extract just the email if it contains brackets, so we can force our custom name
      if (rawEmail.includes('<')) {
        rawEmail = rawEmail.split('<')[1].replace('>', '');
      }
      const fromHeader = `"Turf Booking" <${rawEmail}>`;
      
      const info = await transporter.sendMail({
        from: fromHeader,
        to: toEmail,
        subject: `✅ ${code} is your Turf Booking Verification Code`,
        html: htmlContent,
      });
      
      console.log(`\n========================================\n📧 [NODEMAILER SMTP EMAIL SENT SUCCESS]\nMessage ID: ${info.messageId}\nRecipient: ${toEmail}\nOTP Code: ${code}\n========================================\n`);
      return true;
    } catch (err) {
      console.error('❌ Nodemailer SMTP Send Error:', err.message || err);
      return false;
    }
  } else {
    // DEMO MODE - Just log it if no SMTP credentials are provided
    console.log(`\n========================================\n📧 [NODEMAILER SMTP DEMO / LOG MODE]\nRecipient: ${toEmail}\nOTP Code: ${code}\n(Note: Set SMTP_USER and SMTP_PASS in .env for live SMTP delivery)\n========================================\n`);
    return true;
  }
};

/**
 * Send Forgot Password Email via Nodemailer SMTP
 */
const sendForgotPasswordEmail = async (toEmail, code) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #3b82f6; padding: 36px 25px;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">
                TURF BOOKING
              </div>
              <div style="margin-top: 7px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #bfdbfe; text-transform: uppercase;">
                Password Reset
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td align="center" style="padding: 40px 30px;">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
                Reset Your Password
              </div>
              <div style="font-size: 14px; line-height: 1.7; color: #475569; margin-bottom: 28px;">
                We received a request to reset your password. Please use the code below to reset it.
              </div>
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eff6ff; border: 2px dashed #60a5fa; border-radius: 16px;">
                <tr>
                  <td align="center" style="padding: 20px 15px;">
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #2563eb; text-transform: uppercase; margin-bottom: 8px;">
                      Your Password Reset Code
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #3b82f6; padding-left: 8px;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Expiry -->
              <div style="margin-top: 20px; font-size: 13px; color: #64748b; line-height: 1.6;">
                This reset code will expire in <strong style="color: #334155;">15 minutes</strong>. If you did not request this, please ignore this email.
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 22px 25px;">
              <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} Turf Booking. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = createTransporter();
  
  if (transporter) {
    try {
      let rawEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@turfbooking.com').trim();
      if (rawEmail.includes('<')) {
        rawEmail = rawEmail.split('<')[1].replace('>', '');
      }
      const fromHeader = `"Turf Booking" <${rawEmail}>`;
      
      const info = await transporter.sendMail({
        from: fromHeader,
        to: toEmail,
        subject: `🔑 ${code} is your Password Reset Code`,
        html: htmlContent,
      });
      
      console.log(`\n========================================\n📧 [NODEMAILER SMTP EMAIL SENT SUCCESS]\nMessage ID: ${info.messageId}\nRecipient: ${toEmail}\nReset Code: ${code}\n========================================\n`);
      return true;
    } catch (err) {
      console.error('❌ Nodemailer SMTP Send Error:', err.message || err);
      return false;
    }
  } else {
    // DEMO MODE
    console.log(`\n========================================\n📧 [NODEMAILER SMTP DEMO / LOG MODE FORGOT PASSWORD]\nRecipient: ${toEmail}\nReset Code: ${code}\n========================================\n`);
    return true;
  }
};

module.exports = {
  sendVerificationEmail,
  sendForgotPasswordEmail,
};
