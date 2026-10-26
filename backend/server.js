const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// FIX #1: the default password now matches .env.example / docker-compose.yml.
//   In Docker and CI the real value always comes from the DB_PASSWORD env var.
const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'bugdb',
  password: process.env.DB_PASSWORD || 'bugpassword',
  port:     parseInt(process.env.DB_PORT) || 5432,
});

const VALID_STATUSES = ['open', 'in_progress', 'closed'];

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

// ── GET /api/bugs ────────────────────────────────────────────────────────────
// Returns all bugs, newest first.
// OPTIONAL CHALLENGE: support ?search=<query> to filter by title.
//   Example: GET /api/bugs?search=docker  → bugs whose title contains "docker" (case-insensitive)
//   Hint: Use a SQL WHERE clause with ILIKE.
// OPTIONAL CHALLENGE: support ?status=open to filter by status.
app.get('/api/bugs', async (req, res) => {
  try {
    // STUDENT TODO (optional): read req.query.search / req.query.status
    // and add WHERE clauses when they are provided
    const result = await pool.query('SELECT * FROM bugs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/bugs ───────────────────────────────────────────────────────────
// FIX #2: reject a missing, empty or whitespace-only title with HTTP 400.
//   The typeof check also stops a non-string title (e.g. 123) from crashing .trim().
app.post('/api/bugs', async (req, res) => {
  try {
    const { title, status = 'open' } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'INSERT INTO bugs (title, status) VALUES ($1, $2) RETURNING *',
      [title, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/bugs/:id ─────────────────────────────────────────────────────
// FIX #3: delete one bug. 200 + the deleted row, or 404 if the id does not exist.
app.delete('/api/bugs/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM bugs WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/bugs/:id ────────────────────────────────────────────────────────
// FIX #4: update a bug's title and/or status. 200 + the updated row, or 404.
//   COALESCE keeps the current value of any field left out of the body,
//   so { status: 'closed' } on its own also works.
//
// OPTIONAL CHALLENGE: also accept a { severity } field in the body
//   and store it in the database.  severity must be one of:
//   'low', 'medium', 'high', 'critical'
app.put('/api/bugs/:id', async (req, res) => {
  try {
    const { title, status } = req.body;

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE bugs SET title = COALESCE($1, title), status = COALESCE($2, status) WHERE id = $3 RETURNING *',
      [title, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Server startup ───────────────────────────────────────────────────────────
// FIX #5: only listen when this file is run directly (`node server.js`).
//   When Jest require()-s it, supertest binds its own port instead.
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Bug Tracker backend running on port ${port}`);
  });
}

// FIX #6: export the app so the tests can import it.
module.exports = app;
