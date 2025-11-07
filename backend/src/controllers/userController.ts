import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AvatarService } from '../services/avatarService';

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  preferences?: any;
}

export class UserController {
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
          phone: user.phone,
          role: user.role,
          avatar_url: user.avatar_url,
          timezone: user.timezone,
          locale: user.locale,
          preferences: user.preferences,
          is_verified: user.is_verified,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updateData: UpdateProfileInput = req.body;

      // Remove fields that shouldn't be updated directly
      const { email, password, role, ...allowedUpdates } = updateData as any;

      // Add updated_at timestamp
      (allowedUpdates as any).updated_at = new Date();

      const [updatedUser] = await db('users')
        .where({ id: userId })
        .update(allowedUpdates)
        .returning('*');

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          avatar_url: updatedUser.avatar_url,
          timezone: updatedUser.timezone,
          locale: updatedUser.locale,
          preferences: updatedUser.preferences,
          updated_at: updatedUser.updated_at
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async uploadAvatar(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = (req as any).user.userId;
      
      // Validate file
      AvatarService.validateAvatarFile(req.file);
      
      // Update user avatar
      const avatarUrl = await AvatarService.updateUserAvatar(userId, req.file.filename);

      res.json({
        message: 'Avatar uploaded successfully',
        avatar_url: avatarUrl
      });
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      
      // Delete the uploaded file if there was an error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteAvatar(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      
      await AvatarService.deleteUserAvatar(userId);

      res.json({ message: 'Avatar deleted successfully' });
    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: 'Current password and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'New password must be at least 6 characters long' 
        });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await UserModel.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      await UserModel.updatePassword(userId, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

// Import db at the top of the file
import db from '../config/database';
import fs from 'fs';