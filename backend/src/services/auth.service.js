const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// Comma-separated list of authorized emails, e.g. "ana@acme.com,juan@acme.com".
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// Optional: allow any email from these Google Workspace domains (the "hd" claim).
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const isAuthorized = (email, hd) => {
    if (ALLOWED_EMAILS.length === 0 && ALLOWED_DOMAINS.length === 0) {
        // Fail closed: if no allowlist is configured, nobody gets in.
        return false;
    }
    if (ALLOWED_EMAILS.includes(email)) return true;
    if (hd && ALLOWED_DOMAINS.includes(hd.toLowerCase())) return true;
    return false;
};

/**
 * Verify a Google Identity Services ID token and, if the user is authorized,
 * mint a backend session JWT.
 *
 * @param {string} credential - The Google ID token from the frontend.
 * @returns {Promise<{token: string, user: object}>}
 * @throws {Error} with .status when verification fails or the user is not allowed.
 */
const loginWithGoogle = async (credential) => {
    if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
        const err = new Error('Server auth not configured (GOOGLE_CLIENT_ID / JWT_SECRET missing)');
        err.status = 500;
        throw err;
    }
    if (!credential) {
        const err = new Error('Missing Google credential');
        err.status = 400;
        throw err;
    }

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch (e) {
        const err = new Error('Invalid Google credential');
        err.status = 401;
        throw err;
    }

    const email = (payload.email || '').toLowerCase();

    if (!payload.email_verified) {
        const err = new Error('Google email not verified');
        err.status = 403;
        throw err;
    }

    if (!isAuthorized(email, payload.hd)) {
        const err = new Error('This account is not authorized to use this application');
        err.status = 403;
        throw err;
    }

    const user = {
        email,
        name: payload.name,
        picture: payload.picture
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user };
};

module.exports = {
    loginWithGoogle
};
