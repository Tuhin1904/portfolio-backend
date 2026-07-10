import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
};

const transporter = createTransporter();

export const sendOtpEmail = async (toEmail: string, userName: string, otp: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[MOCK EMAIL] Email credentials not defined. Printing OTP code for ${toEmail} (${userName}) to console: ${otp}`);
    return { id: 'mock-no-credentials', mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"My Portfolio" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Verify your email - My Portfolio',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #312e81; border-radius: 16px; background-color: #0f172a; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Verify Your Email</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">tuhindev.me project tracker</p>
          </div>
          
          <div style="background-color: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #f8fafc; font-size: 16px; margin-top: 0;">Welcome, <strong>${userName}</strong>!</p>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              Thank you for signing up for My Portfolio. Please verify your email address by using the OTP code below:
            </p>
            
            <div style="background: #0f172a; border: 1px solid #312e81; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; border-radius: 8px; color: #6366f1; text-shadow: 0 0 10px rgba(99,102,241,0.2);">
              ${otp}
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
              This code is valid for 15 minutes. If you did not request this, please ignore this email.
            </p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
            This is an automated notification from tuhindev.me.<br>
            © ${new Date().getFullYear()} tuhindev.me. All rights reserved.
          </p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Failed to send OTP email via Nodemailer:', error);
    throw error;
  }
};

export const sendResetPasswordEmail = async (toEmail: string, userName: string, otp: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[MOCK EMAIL] Email credentials not defined. Printing Reset OTP code for ${toEmail} (${userName}) to console: ${otp}`);
    return { id: 'mock-no-credentials', mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"My Portfolio" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Reset your password - My Portfolio',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #312e81; border-radius: 16px; background-color: #0f172a; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">tuhindev.me project tracker</p>
          </div>
          
          <div style="background-color: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #f8fafc; font-size: 16px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. Use the following OTP code to proceed:
            </p>
            
            <div style="background: #0f172a; border: 1px solid #312e81; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; border-radius: 8px; color: #6366f1; text-shadow: 0 0 10px rgba(99,102,241,0.2);">
              ${otp}
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
              This OTP code is valid for 15 minutes. If you did not request a password reset, please ignore this email.
            </p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
            This is an automated notification from tuhindev.me.<br>
            © ${new Date().getFullYear()} tuhindev.me. All rights reserved.
          </p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Failed to send Reset Password email via Nodemailer:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (toEmail: string, userName: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[MOCK EMAIL] Email credentials not defined. Welcome email to ${toEmail} (${userName}) skipped.`);
    return { id: 'mock-no-credentials', mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"My Portfolio" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome message from tuhindev.me',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #312e81; border-radius: 16px; background-color: #0f172a; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to tuhindev.me!</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">tuhindev.me project tracker</p>
          </div>
          
          <div style="background-color: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #f8fafc; font-size: 16px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              We are absolutely thrilled to welcome you to our community! Your account has been successfully verified, and you're now ready to explore everything we have to offer.
            </p>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              On <strong>tuhindev.me</strong>, you can view your projects, track milestones, submit new queries, and interact directly.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tuhindev.me" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(99,102,241,0.4);">
                Visit Dashboard
              </a>
            </div>
            
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
              If you have any questions or feedback, feel free to reply to this email or reach out to us at any time.
            </p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
            You are receiving this email because you signed up on tuhindev.me.<br>
            © ${new Date().getFullYear()} tuhindev.me. All rights reserved.
          </p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Failed to send Welcome email via Nodemailer:', error);
    throw error;
  }
};

export const sendQueryStatusEmail = async (
  toEmail: string,
  userName: string,
  workType: string,
  newStatus: string,
  oldStatus: string
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[MOCK EMAIL] Email credentials not defined. Skipping status update email to ${toEmail}.`);
    return { id: 'mock-no-credentials', mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"My Portfolio" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Project Inquiry Status Update - ${workType}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #312e81; border-radius: 16px; background-color: #0f172a; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Status Updated</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">tuhindev.me project tracker</p>
          </div>
          
          <div style="background-color: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #f8fafc; font-size: 16px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              The status of your project inquiry for <strong>"${workType}"</strong> has been updated.
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="display: inline-block; background-color: #334155; color: #94a3b8; padding: 10px 20px; border-radius: 8px; font-size: 14px; text-decoration: line-through; font-weight: 500; margin: 5px;">
                ${oldStatus.toUpperCase()}
              </div>
              <span style="font-size: 20px; color: #6366f1; font-weight: bold; margin: 0 10px; display: inline-block; vertical-align: middle;">➔</span>
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(79,70,229,0.3); margin: 5px;">
                ${newStatus.toUpperCase()}
              </div>
            </div>
            
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
              You can track this inquiry, view progress, and access milestones by visiting your dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://tuhindev.me" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(99,102,241,0.4);">
              Go to Dashboard
            </a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
            This is an automated notification from tuhindev.me.<br>
            © ${new Date().getFullYear()} tuhindev.me. All rights reserved.
          </p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Failed to send status update email via Nodemailer:', error);
    throw error;
  }
};
