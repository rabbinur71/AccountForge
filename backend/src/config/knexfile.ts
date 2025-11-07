import type { Knex } from 'knex';
import dotenv from 'dotenv';

// Load .env only in non-production (e.g., local dev)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../../.env' });
}

// Validate DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    '❌ Missing DATABASE_URL in environment. Please check your .env file.'
  );
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: DATABASE_URL,
    migrations: {
      directory: '../migrations',
      extension: 'ts',
    },
    seeds: {
      directory: '../seeds',
      extension: 'ts',
    },
    // Optional: helpful for local debugging
    debug: process.env.NODE_ENV === 'development',
  },

  production: {
    client: 'pg',
    connection: DATABASE_URL,
    migrations: {
      directory: '../migrations',
    },
    seeds: {
      directory: '../seeds',
    },
  },
};

export default config;