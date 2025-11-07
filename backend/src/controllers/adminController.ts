import { Request, Response } from 'express';
import db from '../config/database';
import { UserModel } from '../models/User';
import { AuditLogService } from '../services/auditLogService';
import type { Knex } from 'knex';

// Extend Request with authenticated user context
interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

export interface UserListFilters {
  role?: string;
  is_verified?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
}

interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  user_id?: string;
  start_date?: Date;
  end_date?: Date;
}

// Reusable Knex filter function for audit logs
function applyAuditFilters(
  query: Knex.QueryBuilder,
  filters: AuditLogFilters
): Knex.QueryBuilder {
  if (filters.action) {
    query = query.where('action', 'ilike', `%${filters.action}%`);
  }
  if (filters.resource_type) {
    query = query.where('resource_type', filters.resource_type);
  }
  if (filters.user_id) {
    query = query.where('user_id', filters.user_id);
  }
  if (filters.start_date) {
    query = query.where('created_at', '>=', filters.start_date);
  }
  if (filters.end_date) {
    query = query.where('created_at', '<=', filters.end_date);
  }
  return query;
}

export class AdminController {
static async getUsers(req: Request, res: Response) {
  console.log('DEBUG: getUsers executed at', new Date().toISOString());

  try {
    const {
      role,
      is_verified,
      search,
      start_date,
      end_date,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const buildBaseQuery = () => {
      let q = db('users').select(
        'id',
        'email',
        'name',
        'role',
        'is_verified',
        'avatar_url',
        'last_login_at',
        'created_at',
        'updated_at'
      );

      if (role) q = q.where({ role: String(role) });
      if (is_verified !== undefined) {
        q = q.where({ is_verified: is_verified === 'true' });
      }
      if (search) {
        q = q.where((builder) => {
          builder.where('email', 'ilike', `%${search}%`)
                 .orWhere('name', 'ilike', `%${search}%`);
        });
      }
      if (start_date) {
        const startDate = new Date(start_date as string);
        if (!isNaN(startDate.getTime())) {
          q = q.where('created_at', '>=', startDate);
        }
      }
      if (end_date) {
        const endDate = new Date(end_date as string);
        if (!isNaN(endDate.getTime())) {
          q = q.where('created_at', '<=', endDate);
        }
      }
      return q;
    };

    // Total count - isolated
    const totalCountResult = await buildBaseQuery()
      .clearSelect()
      .clearOrder()
      .count('* as count')
      .first();
    const total = Number(totalCountResult?.count || 0);

    // Data - isolated
    const users = await buildBaseQuery()
      .orderBy('created_at', 'desc')
      .limit(limitNum)
      .offset(offset);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

  static async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await db('users')
        .where({ id: userId })
        .select(
          'id',
          'email',
          'name',
          'phone',
          'role',
          'is_verified',
          'avatar_url',
          'timezone',
          'locale',
          'preferences',
          'last_login_at',
          'last_login_ip',
          'created_at',
          'updated_at'
        )
        .first();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const recentActivity = await AuditLogService.getLogsForUser(userId, 10);

      res.json({
        user,
        recent_activity: recentActivity,
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, phone, role, timezone, locale, preferences } = req.body;
      const adminId = (req as AuthenticatedRequest).user.userId;

      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updateData: Partial<{
        name: string;
        phone: string;
        role: string;
        timezone: string;
        locale: string;
        preferences: unknown;
        updated_at: Date;
      }> = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (locale !== undefined) updateData.locale = locale;
      if (preferences !== undefined) updateData.preferences = preferences;
      updateData.updated_at = new Date();

      const [updatedUser] = await db('users')
        .where({ id: userId })
        .update(updateData)
        .returning([
          'id',
          'email',
          'name',
          'phone',
          'role',
          'timezone',
          'locale',
          'updated_at',
        ]);

      await AuditLogService.log({
        action: 'admin_user_update',
        resource_type: 'user',
        resource_id: userId,
        user_id: adminId,
        old_values: {
          name: currentUser.name,
          phone: currentUser.phone,
          role: currentUser.role,
          timezone: currentUser.timezone,
          locale: currentUser.locale,
          preferences: currentUser.preferences,
        },
        new_values: updateData,
        metadata: {
          updated_by_admin: adminId,
        },
      });

      // Intentionally omit sensitive fields like preferences in response
      const { preferences: _, ...safeUser } = updatedUser;

      res.json({
        message: 'User updated successfully',
        user: safeUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminId = (req as AuthenticatedRequest).user.userId;

      if (userId === adminId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Safely handle possibly null/undefined metadata
      const currentMeta =
        user.metadata && typeof user.metadata === 'object' ? user.metadata : {};

      await db('users')
        .where({ id: userId })
        .update({
          metadata: { ...currentMeta, deleted: true, deleted_at: new Date() },
          email: `deleted_${Date.now()}_${user.email}`,
          updated_at: new Date(),
        });

      await AuditLogService.log({
        action: 'admin_user_delete',
        resource_type: 'user',
        resource_id: userId,
        user_id: adminId,
        old_values: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
        metadata: {
          deleted_by_admin: adminId,
          soft_delete: true,
        },
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        action,
        resource_type,
        user_id,
        start_date,
        end_date,
        page = '1',
        limit = '50',
      } = req.query;

      // Parse and validate dates
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (start_date) {
        parsedStartDate = new Date(start_date as string);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ message: 'Invalid start_date format' });
        }
      }

      if (end_date) {
        parsedEndDate = new Date(end_date as string);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: 'Invalid end_date format' });
        }
      }

      const filters: AuditLogFilters = {
        action: action as string | undefined,
        resource_type: resource_type as string | undefined,
        user_id: user_id as string | undefined,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
      };

      const offset = (Number(page) - 1) * Number(limit);

      // Use shared filter logic
      const logs = await applyAuditFilters(
        db('audit_logs')
          .select(
            'audit_logs.*',
            'users.email as user_email',
            'users.name as user_name'
          )
          .leftJoin('users', 'audit_logs.user_id', 'users.id'),
        filters
      )
        .orderBy('audit_logs.created_at', 'desc')
        .limit(Number(limit))
        .offset(offset);

      const totalCount = await applyAuditFilters(db('audit_logs'), filters)
        .count('id as count')
        .first();

      res.json({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount?.count || 0),
          pages: Math.ceil(Number(totalCount?.count || 0) / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - SEVEN_DAYS);

      const totalUsers = await db('users').count('id as count').first();
      const verifiedUsers = await db('users').where({ is_verified: true }).count('id as count').first();
      const recentUsers = await db('users')
        .where('created_at', '>=', cutoffDate)
        .count('id as count')
        .first();

      const auditStats = await AuditLogService.getStats();

      const roleDistribution = await db('users')
        .select('role')
        .count('id as count')
        .groupBy('role');

      res.json({
        users: {
          total: Number(totalUsers?.count) || 0,
          verified: Number(verifiedUsers?.count) || 0,
          recent: Number(recentUsers?.count) || 0,
        },
        audit_logs: auditStats,
        role_distribution: roleDistribution,
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}