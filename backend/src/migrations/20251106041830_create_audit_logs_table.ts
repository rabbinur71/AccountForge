import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Action details
    table.string('action').notNullable(); // e.g., 'user_login', 'profile_update', 'avatar_upload'
    table.string('resource_type').notNullable(); // e.g., 'user', 'order', 'payment'
    table.uuid('resource_id').nullable(); // ID of the affected resource
    
    // User who performed the action
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Additional context
    table.jsonb('old_values').nullable(); // Previous state
    table.jsonb('new_values').nullable(); // New state
    table.jsonb('metadata').defaultTo('{}'); // Additional context like IP, user agent
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for efficient querying
    table.index(['user_id']);
    table.index(['action']);
    table.index(['resource_type', 'resource_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('audit_logs');
}