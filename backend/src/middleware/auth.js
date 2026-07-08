const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Express middleware that requires a valid session token issued by this backend
 * (see auth.service.js). The token is a signed JWT; the frontend obtains it from
 * POST /api/auth/google and sends it as `Authorization: Bearer <token>`.
 *
 * Set AUTH_DISABLED=true to bypass verification (local development only).
 */
const requireAuth = (req, res, next) => {
    if (process.env.AUTH_DISABLED === 'true') {
        return next();
    }

    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not set; rejecting all authenticated requests.');
        return res.status(500).json({ error: 'Server auth misconfigured' });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
};

module.exports = requireAuth;
