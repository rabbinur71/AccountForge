import fs from 'fs';
import path from 'path';
import db from '../config/database';

export class AvatarService {
  static async updateUserAvatar(userId: string, avatarFilename: string): Promise<string> {
    const avatarUrl = `/uploads/avatars/${avatarFilename}`;
    
    // First, get old avatar to delete it
    const user = await db('users').where({ id: userId }).select('avatar_url').first();
    
    if (user?.avatar_url) {
      const oldFilename = user.avatar_url.replace('/uploads/avatars/', '');
      this.deleteAvatarFile(oldFilename);
    }
    
    // Update user with new avatar
    await db('users')
      .where({ id: userId })
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date()
      });
    
    return avatarUrl;
  }

  static async deleteUserAvatar(userId: string): Promise<void> {
    const user = await db('users').where({ id: userId }).select('avatar_url').first();
    
    if (user?.avatar_url) {
      const filename = user.avatar_url.replace('/uploads/avatars/', '');
      this.deleteAvatarFile(filename);
      
      await db('users')
        .where({ id: userId })
        .update({
          avatar_url: null,
          updated_at: new Date()
        });
    }
  }

  private static deleteAvatarFile(filename: string): void {
    const filePath = path.join('uploads', 'avatars', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  static validateAvatarFile(file: Express.Multer.File): void {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }
  }
}