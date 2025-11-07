import { Request, Response } from 'express';
import { UserModel, CreateUserInput } from '../models/User';
import { JWTUtil, TokenPayload } from '../utils/jwt';
import { EmailService } from '../utils/email';
import { TokenUtil } from '../utils/tokens';
import { AuditLogService } from '../services/auditLogService';
import db from '../config/database';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, role = 'user' }: CreateUserInput = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: 'User already exists with this email'
        });
      }

      const user = await UserModel.create({
        email,
        password,
        name,
        role
      });
	
      // Generate and store verification token (don't auto-verify in real app)
      const verificationToken = TokenUtil.generateVerificationToken();
      await UserModel.updateVerificationToken(user.id, verificationToken);

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);

      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_verified: user.is_verified
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.is_verified) {
        return res.status(403).json({ 
          message: 'Please verify your email before logging in' 
        });
      }

      // Audit logging & last login update
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress || 'Unknown';

      // Log the login action
      await AuditLogService.log({
        action: 'user_login',
        resource_type: 'user',
        resource_id: user.id,
        user_id: user.id,
        metadata: {
          user_agent: userAgent,
          ip_address: ip,
          login_method: 'email_password'
        }
      });

      // Update last login info
      await db('users')
        .where({ id: user.id })
        .update({
          last_login_at: new Date(),
          last_login_ip: ip
        });

      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = JWTUtil.generateAccessToken(tokenPayload);
      const refreshToken = JWTUtil.generateRefreshToken(tokenPayload);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_verified: user.is_verified,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      const user = await UserModel.findByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ 
          message: 'Invalid or expired verification token' 
        });
      }

      // Verify the user
      const verifiedUser = await UserModel.verifyUser(token);
      
      if (!verifiedUser) {
        return res.status(400).json({ 
          message: 'Email verification failed' 
        });
      }

      res.json({
        message: 'Email verified successfully! You can now log in.',
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          name: verifiedUser.name,
          is_verified: verifiedUser.is_verified
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ 
          message: 'If an account with this email exists, a verification email has been sent.' 
        });
      }

      if (user.is_verified) {
        return res.status(400).json({ 
          message: 'Email is already verified' 
        });
      }

      const newToken = TokenUtil.generateVerificationToken();
      await UserModel.updateVerificationToken(user.id, newToken);
      // Send verification email
      await EmailService.sendVerificationEmail(user.email, user.name, newToken);

      res.json({ 
        message: 'Verification email sent successfully. Please check your inbox.' 
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        return res.json({ 
          message: 'If an account with this email exists, a password reset email has been sent.' 
        });
      }

      const resetToken = TokenUtil.generateResetToken();
      await UserModel.updateResetToken(user.id, resetToken);
      await EmailService.sendPasswordResetEmail(user.email, user.name, resetToken);

      res.json({ 
        message: 'Password reset email sent successfully. Please check your inbox.' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ 
          message: 'Reset token and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long' 
        });
      }

      const user = await UserModel.findByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token' 
        });
      }

      await UserModel.updatePassword(user.id, newPassword);

      res.json({ 
        message: 'Password reset successfully! You can now log in with your new password.' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      res.json({ 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      const payload = JWTUtil.verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(payload.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = JWTUtil.generateAccessToken(tokenPayload);
      const newRefreshToken = JWTUtil.generateRefreshToken(tokenPayload);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
  }
}