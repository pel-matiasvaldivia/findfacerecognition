const { Pool } = require('pg');

// Self-hosted Postgres (see docker-compose.yml). Configure with DATABASE_URL,
// e.g. postgres://user:pass@postgres:5432/facerecognition
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
    console.error('Postgres pool error:', err.message);
});

/**
 * Ensure the access_logs table exists. Called once at startup.
 */
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_logs (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at timestamptz NOT NULL DEFAULT now(),
                image_url text NOT NULL,
                detection_id text,
                matched_card_id text,
                confidence double precision,
                status text CHECK (status IN ('MATCH', 'NO_MATCH', 'ERROR')),
                metadata jsonb
            );
        `);
        console.log('Database ready (access_logs).');
    } catch (error) {
        console.error('Failed to initialize database:', error.message);
    }
};

/**
 * Log an access attempt to the database.
 * @param {Object} logData - Data to log
 * @returns {Promise<Object|null>} Created log entry (or null on failure)
 */
const logAccess = async (logData) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO access_logs
                (image_url, detection_id, matched_card_id, confidence, status, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                logData.imageUrl,
                logData.detectionId || null,
                logData.matchedCardId || null,
                logData.confidence || null,
                logData.status,
                logData.metadata || {}
            ]
        );
        return rows[0];
    } catch (error) {
        console.error('Error logging access:', error.message);
        // Don't throw: logging must not block the main access flow.
        return null;
    }
};

/**
 * Lightweight connectivity check for diagnostics.
 * @returns {Promise<boolean>}
 */
const pingDb = async () => {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = {
    initDb,
    logAccess,
    pingDb
};
