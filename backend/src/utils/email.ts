import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// For development, we'll use Ethereal Email (fake SMTP service)
const createTransporter = async () => {
  if (process.env.NODE_ENV === 'development') {
    // Create test account if no credentials provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const testAccount = await nodemailer.createTestAccount();
      process.env.EMAIL_USER = testAccount.user;
      process.env.EMAIL_PASS = testAccount.pass;
      
      console.log('📧 Ethereal Email Credentials for testing:');
      console.log(`Email: ${testAccount.user}`);
      console.log(`Password: ${testAccount.pass}`);
    }

    // createTransport
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // For production, use real SMTP credentials
  // createTransport
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export class EmailService {
  static async sendVerificationEmail(email: string, name: string, token: string) {
    const transporter = await createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"AccountForge" <noreply@accountforge.com>',
      to: email,
      subject: 'Verify Your Email - AccountForge',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to AccountForge!</h2>
          <p>Hello ${name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Verification email sent:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  }

  static async sendPasswordResetEmail(email: string, name: string, token: string) {
    const transporter = await createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"AccountForge" <noreply@accountforge.com>',
      to: email,
      subject: 'Reset Your Password - AccountForge',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Password reset email sent:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  }
}