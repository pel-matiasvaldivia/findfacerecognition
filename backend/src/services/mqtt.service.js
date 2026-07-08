const mqtt = require('mqtt');

// Connect to the local broker container (service name 'mqtt')
// Or 'localhost' if running outside docker but mapped ports?
// Inside docker network, host is 'mqtt'.
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://mqtt:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const DOOR_TOPIC = 'access/door';

let client = null;

const connect = () => {
    console.log(`Connecting to MQTT Broker at ${MQTT_BROKER_URL}...`);

    if (!MQTT_USERNAME || !MQTT_PASSWORD) {
        console.warn('MQTT_USERNAME/MQTT_PASSWORD not set. The broker now requires authentication; the connection will fail until credentials are provided.');
    }

    client = mqtt.connect(MQTT_BROKER_URL, {
        reconnectPeriod: 5000, // Reconnect every 5 seconds
        clientId: 'backend-service-' + Math.random().toString(16).substr(2, 8),
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
    });

    client.on('connect', () => {
        console.log('MQTT Client Connected');
    });

    client.on('error', (err) => {
        console.error('MQTT Client Error:', err.message);
    });

    client.on('offline', () => {
        console.log('MQTT Client Offline');
    });
};

const openDoor = (duration = 5000, userId = null, userName = null) => {
    if (!client || !client.connected) {
        console.warn('MQTT Client not connected. Cannot send open command.');
        return false;
    }

    const payload = JSON.stringify({
        command: 'OPEN',
        duration: duration,
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName || 'Unknown'
    });

    console.log(`Publishing MQTT: ${DOOR_TOPIC} -> ${payload}`);

    // Publish with QoS 1 to ensure delivery
    client.publish(DOOR_TOPIC, payload, { qos: 1, retain: false }, (err) => {
        if (err) {
            console.error('Failed to publish MQTT message:', err);
        }
    });

    return true;
};

module.exports = {
    connect,
    openDoor
};
