import db from '../config/database';

export interface AuditLogEntry {
  action: string;
  resource_type: string;
  resource_id?: string;
  user_id: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
}

export class AuditLogService {
  static async log(entry: AuditLogEntry): Promise<void> {
    await db('audit_logs').insert({
      ...entry,
      created_at: new Date()
    });
  }

  static async getLogsForUser(userId: string, limit: number = 50, offset: number = 0) {
    return db('audit_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getLogsByAction(action: string, limit: number = 50, offset: number = 0) {
    return db('audit_logs')
      .where({ action })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getLogsByResource(resourceType: string, resourceId: string, limit: number = 50, offset: number = 0) {
    return db('audit_logs')
      .where({ 
        resource_type: resourceType,
        resource_id: resourceId 
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async searchLogs(filters: {
    action?: string;
    resource_type?: string;
    user_id?: string;
    start_date?: Date;
    end_date?: Date;
  }, limit: number = 50, offset: number = 0) {
    let query = db('audit_logs');
    
    if (filters.action) {
      query = query.where('action', 'ilike', `%${filters.action}%`);
    }
    
    if (filters.resource_type) {
      query = query.where({ resource_type: filters.resource_type });
    }
    
    if (filters.user_id) {
      query = query.where({ user_id: filters.user_id });
    }
    
    if (filters.start_date) {
      query = query.where('created_at', '>=', filters.start_date);
    }
    
    if (filters.end_date) {
      query = query.where('created_at', '<=', filters.end_date);
    }
    
    return query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

static async getStats() {
  const totalLogs = await db('audit_logs').count('id as count').first();
  const actionsCount = await db('audit_logs')
    .select('action')
    .count('id as count')
    .groupBy('action')
    .orderBy('count', 'desc');

  // qualify created_at with table name
  const recentActivity = await db('audit_logs')
    .select(
      'audit_logs.action',
      'audit_logs.resource_type',
      'audit_logs.user_id',
      'audit_logs.created_at',
      'users.email as user_email',
      'users.name as user_name'
    )
    .innerJoin('users', 'audit_logs.user_id', 'users.id')
    .orderBy('audit_logs.created_at', 'desc') // explicit
    .limit(10);

  return {
    total_logs: totalLogs?.count || 0,
    actions_count: actionsCount,
    recent_activity: recentActivity
  };
}
}