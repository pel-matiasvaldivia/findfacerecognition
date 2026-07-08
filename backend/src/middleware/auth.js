const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Supabase client used only to validate the caller's access token.
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Express middleware that requires a valid Supabase access token.
 *
 * The frontend obtains this token from its Supabase (Google OAuth) session
 * and must send it as `Authorization: Bearer <token>`. Without this, the
 * sensitive endpoints (enroll, door/open, search) were reachable by anyone
 * who could hit the backend port.
 *
 * Set AUTH_DISABLED=true to bypass verification (local development only).
 */
const requireAuth = async (req, res, next) => {
    if (process.env.AUTH_DISABLED === 'true') {
        return next();
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        req.user = data.user;
        return next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = requireAuth;
