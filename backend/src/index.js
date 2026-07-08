const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');
const { connect: connectMqtt } = require('./services/mqtt.service');
const { initDb } = require('./services/db.service');
const { UPLOADS_DIR } = require('./services/storage.service');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize MQTT and the database
connectMqtt();
initDb();

// CORS configuration for production
const corsOptions = {
    origin: [
        'http://localhost:3300',
        'http://localhost:3000',
        'https://app.faceid.alertasenlinea.com.ar',
        'http://app.faceid.alertasenlinea.com.ar',
        'https://faceid.alertasenlinea.com.ar'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve locally stored access photos (replaces Supabase Storage).
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth endpoints are public (they issue sessions); everything under /api requires auth.
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const healthRoutes = require('./routes/health.routes');

app.use('/health', healthRoutes);

app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'face-recognition-backend' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
