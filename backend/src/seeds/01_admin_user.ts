import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Inserts seed entries
  await knex('users').insert([
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@accountforge.com',
      password_hash: await bcrypt.hash('admin123', 12),
      name: 'System Administrator',
      role: 'admin',
      is_verified: true,
      timezone: 'UTC',
      locale: 'en-US',
      preferences: JSON.stringify({ theme: 'dark' }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'merchant@example.com',
      password_hash: await bcrypt.hash('merchant123', 12),
      name: 'Test Merchant',
      role: 'merchant',
      is_verified: true,
      timezone: 'Asia/Dhaka',
      locale: 'en-BD',
      preferences: JSON.stringify({ theme: 'light' }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}