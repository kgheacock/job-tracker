/**
 * Seed script — inserts realistic test data for local development.
 * Safe to re-run: clears existing data first.
 * Never run in production.
 */

import pool from './pool.mjs';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script must not be run in production');
}

console.log('Seeding database...');

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Clear in FK-safe order
  await client.query('DELETE FROM notes');
  await client.query('DELETE FROM contacts');
  await client.query('DELETE FROM status_events');
  await client.query('DELETE FROM refresh_tokens');
  await client.query('DELETE FROM jobs');
  await client.query('DELETE FROM users');

  // Seed user — password is "password123" (bcrypt hash, cost 12)
  const { rows: [user] } = await client.query(`
    INSERT INTO users (email, password_hash)
    VALUES ('keith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewi7AJSQ5nJrLIby')
    RETURNING id
  `);
  const userId = user.id;

  // Seed jobs across several statuses
  const jobs = [
    {
      company: 'Stripe',
      title: 'Senior Software Engineer, Dashboard',
      url: 'https://stripe.com/jobs/listing/1234',
      location: 'Remote',
      status: 'applied',
      applied_at: '2026-03-10',
      events: [
        { status: 'saved',   note: 'Saw on LinkedIn' },
        { status: 'applied', note: 'Applied via company site' },
      ],
      contacts: [
        { name: 'Alex Kim', role: 'Engineering Manager', linkedin: 'https://linkedin.com/in/alexkim' },
      ],
      notes: ['Great culture signal from Glassdoor reviews. Ask about eng org structure.'],
    },
    {
      company: 'Linear',
      title: 'Software Engineer, Frontend',
      url: 'https://linear.app/jobs',
      location: 'Remote',
      status: 'phone_screen',
      applied_at: '2026-03-08',
      events: [
        { status: 'saved',        note: null },
        { status: 'applied',      note: 'Referral from Jordan' },
        { status: 'phone_screen', note: 'Scheduled for March 20 with recruiter' },
      ],
      contacts: [
        { name: 'Jordan Lee', role: 'Senior Engineer', email: 'jordan@linear.app', notes: 'Referred me' },
        { name: 'Sam Torres', role: 'Recruiter', email: 'sam@linear.app' },
      ],
      notes: ['Prep: read linear.app changelog, know their data model (issues/cycles/projects)'],
    },
    {
      company: 'Vercel',
      title: 'Staff Engineer, Runtime',
      url: 'https://vercel.com/careers',
      location: 'Remote',
      status: 'rejected',
      applied_at: '2026-02-28',
      events: [
        { status: 'saved',    note: null },
        { status: 'applied',  note: null },
        { status: 'rejected', note: 'Form rejection after 2 weeks, no feedback' },
      ],
      contacts: [],
      notes: [],
    },
    {
      company: 'Notion',
      title: 'Senior Frontend Engineer',
      url: 'https://notion.so/careers',
      location: 'San Francisco, CA (Hybrid)',
      status: 'saved',
      applied_at: null,
      events: [
        { status: 'saved', note: 'Interesting stack — React + custom renderer' },
      ],
      contacts: [],
      notes: ['Reach out to someone on the team first before applying cold'],
    },
    {
      company: 'Figma',
      title: 'Software Engineer, Editor Infrastructure',
      url: 'https://figma.com/careers',
      location: 'San Francisco, CA',
      status: 'technical',
      applied_at: '2026-03-05',
      events: [
        { status: 'saved',        note: null },
        { status: 'applied',      note: 'Applied via Greenhouse' },
        { status: 'phone_screen', note: 'Good call, positive signal' },
        { status: 'technical',    note: 'Take-home due March 22' },
      ],
      contacts: [
        { name: 'Riley Park', role: 'Tech Lead', linkedin: 'https://linkedin.com/in/rileypark' },
      ],
      notes: [
        'Take-home: build a collaborative text editor component. Focus on correctness > features.',
        'Ask about team structure — is this infra or product eng?',
      ],
    },
  ];

  for (const job of jobs) {
    const { rows: [row] } = await client.query(
      `INSERT INTO jobs (user_id, company, title, url, location, current_status, applied_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, job.company, job.title, job.url, job.location, job.status, job.applied_at]
    );
    const jobId = row.id;

    for (const event of job.events) {
      await client.query(
        `INSERT INTO status_events (job_id, status, note) VALUES ($1, $2, $3)`,
        [jobId, event.status, event.note]
      );
    }

    for (const contact of job.contacts) {
      await client.query(
        `INSERT INTO contacts (job_id, name, role, email, linkedin, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [jobId, contact.name, contact.role ?? null, contact.email ?? null,
         contact.linkedin ?? null, contact.notes ?? null]
      );
    }

    for (const body of job.notes) {
      await client.query(
        `INSERT INTO notes (job_id, body) VALUES ($1, $2)`,
        [jobId, body]
      );
    }
  }

  await client.query('COMMIT');
  console.log(`✓ Seeded 1 user, ${jobs.length} jobs with events, contacts, and notes`);
  console.log('  Login: keith@example.com / password123');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', err);
  throw err;
} finally {
  client.release();
  await pool.end();
}
