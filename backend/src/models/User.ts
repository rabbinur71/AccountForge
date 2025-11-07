import db from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string | null;  
  avatar_url?: string | null;
  timezone?: string | null;
  locale?: string | null;
  preferences?: Record<string, any>;    // (or define a stricter type if needed)
  last_login_at?: Date | null;          
  // last_login_ip?: string | null;

  role: 'user' | 'admin' | 'merchant';
  is_verified: boolean;

  // Token fields (optional)
  verification_token?: string | null;
  verification_token_expires?: Date | null;
  reset_token?: string | null;
  reset_token_expires?: Date | null;

  // Legacy or fallback (optional: consider deprecating if not used)
  metadata?: any;

  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'admin' | 'merchant';
  metadata?: any;
}

export class UserModel {
  static async create(userData: CreateUserInput): Promise<User> {
    const { password, ...userWithoutPassword } = userData;
    const password_hash = await bcrypt.hash(password, 12);
    
    const [user] = await db('users')
      .insert({
        ...userWithoutPassword,
        password_hash,
        role: userData.role || 'user',
        is_verified: false,
        metadata: userData.metadata || {},
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    return user;
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  }
  // many APIs use 'null' for "not found" and avoids 'undefined' issues.
  static async findById(id: string): Promise<User | null> {
  const user = await db('users').where({ id }).first();
  return user || null;
}

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Email Verification Methods
  static async updateVerificationToken(userId: string, token: string): Promise<void> {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await db('users')
      .where({ id: userId })
      .update({
        verification_token: token,
        verification_token_expires: expires,
        updated_at: new Date()
      });
  }

  static async verifyUser(token: string): Promise<User | undefined> {
    const [user] = await db('users')
      .where({ verification_token: token })
      .where('verification_token_expires', '>', new Date())
      .update({
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
        updated_at: new Date()
      })
      .returning('*');
    
    return user;
  }

  static async findByVerificationToken(token: string): Promise<User | undefined> {
    return db('users')
      .where({ verification_token: token })
      .where('verification_token_expires', '>', new Date())
      .first();
  }

  static async clearVerificationToken(userId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({
        verification_token: null,
        verification_token_expires: null,
        updated_at: new Date()
      });
  }

  // Password Reset Methods
  static async updateResetToken(userId: string, token: string): Promise<void> {
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db('users')
      .where({ id: userId })
      .update({
        reset_token: token,
        reset_token_expires: expires,
        updated_at: new Date()
      });
  }

  static async findByResetToken(token: string): Promise<User | undefined> {
    return db('users')
      .where({ reset_token: token })
      .where('reset_token_expires', '>', new Date())
      .first();
  }

  static async clearResetToken(userId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date()
      });
  }

  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, 12);
    
    await db('users')
      .where({ id: userId })
      .update({
        password_hash,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date()
      });
  }
}