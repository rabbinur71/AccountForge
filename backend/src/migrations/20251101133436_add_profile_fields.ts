import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Profile fields
    table.string('phone').nullable();
    table.string('avatar_url').nullable();
    table.string('timezone').defaultTo('UTC');
    table.string('locale').defaultTo('en-US');
    table.jsonb('preferences').defaultTo('{}');
    
    // Audit fields
    table.timestamp('last_login_at').nullable();
    table.string('last_login_ip').nullable();
    
    // Indexes
    table.index(['last_login_at']);
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone');
    table.dropColumn('avatar_url');
    table.dropColumn('timezone');
    table.dropColumn('locale');
    table.dropColumn('preferences');
    table.dropColumn('last_login_at');
    table.dropColumn('last_login_ip');
  });
}