import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('name').notNullable();
    table.string('role').defaultTo('user');
    table.jsonb('metadata').defaultTo('{}');
    
    // Email verification
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token').nullable();
    table.timestamp('verification_token_expires').nullable();
    
    // Password reset
    table.string('reset_token').nullable();
    table.timestamp('reset_token_expires').nullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['email']);
    table.index(['verification_token']);
    table.index(['reset_token']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}