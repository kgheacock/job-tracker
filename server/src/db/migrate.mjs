/**
 * Simple migration runner.
 *
 * Migrations are numbered SQL files in server/src/db/migrations/.
 * Applied migrations are tracked in a `schema_migrations` table.
 *
 * Usage:
 *   node src/db/migrate.mjs          # run pending migrations
 *   node src/db/migrate.mjs --undo   # revert last migration
 *   node src/db/migrate.mjs --reset  # drop all + re-run all (dev only)
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  return new Set(rows.map((r) => r.version));
}

async function getMigrationFiles() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith('.up.sql'))
    .sort()
    .map((f) => ({
      version: f.replace('.up.sql', ''),
      upFile: join(MIGRATIONS_DIR, f),
      downFile: join(MIGRATIONS_DIR, f.replace('.up.sql', '.down.sql')),
    }));
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const migrations = await getMigrationFiles();
    const pending = migrations.filter((m) => !applied.has(m.version));

    if (pending.length === 0) {
      console.log('✓ All migrations applied — nothing to do');
      return;
    }

    for (const migration of pending) {
      console.log(`→ Applying ${migration.version}...`);
      const sql = await readFile(migration.upFile, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration.version]
        );
        await client.query('COMMIT');
        console.log(`✓ Applied ${migration.version}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed ${migration.version}:`, err.message);
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

async function undoLastMigration() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );
    if (rows.length === 0) {
      console.log('No migrations to undo');
      return;
    }
    const version = rows[0].version;
    const migrations = await getMigrationFiles();
    const migration = migrations.find((m) => m.version === version);
    if (!migration) throw new Error(`Migration file not found for version: ${version}`);

    console.log(`→ Reverting ${version}...`);
    let sql;
    try {
      sql = await readFile(migration.downFile, 'utf8');
    } catch {
      throw new Error(`No .down.sql file found for ${version} — cannot undo`);
    }

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
      await client.query('COMMIT');
      console.log(`✓ Reverted ${version}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }
  const client = await pool.connect();
  try {
    console.log('⚠ Resetting database (dev only)...');
    await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await client.query('DROP TABLE IF EXISTS notes CASCADE');
    await client.query('DROP TABLE IF EXISTS contacts CASCADE');
    await client.query('DROP TABLE IF EXISTS status_events CASCADE');
    await client.query('DROP TABLE IF EXISTS jobs CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✓ All tables dropped');
  } finally {
    client.release();
  }
  await runMigrations();
}

const arg = process.argv[2];
try {
  if (arg === '--undo') {
    await undoLastMigration();
  } else if (arg === '--reset') {
    await resetDatabase();
  } else {
    await runMigrations();
  }
} finally {
  await pool.end();
}
