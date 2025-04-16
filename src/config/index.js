require('dotenv').config();

module.exports = {
    // WhatsApp bot configuration
    AUTH_FOLDER: process.env.AUTH_FOLDER || 'auth_info',
    RECONNECT_INTERVAL_MS: 10000,
    
    // Group markers
    ON_GROUP_MARKER: process.env.ON_GROUP_MARKER || "alerts-poll-bot-on",
    OFF_GROUP_MARKER: process.env.OFF_GROUP_MARKER || "alerts-poll-bot-off",
    
    // Alert configuration
    CITY_NAME: process.env.CITY_NAME,
    ALERT_CHECK_INTERVAL_MS: parseInt(process.env.ALERT_CHECK_INTERVAL_MS || "15000"),
    ALERT_API_URL: "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json",
    ALERT_API_REFERER: "https://www.oref.org.il/heb",
    ALERT_API_TIMEOUT_MS: 5000,
    
    // Poll configuration
    POLL_INTERVAL_MINUTES: parseInt(process.env.POLL_INTERVAL_MINUTES || "15"),
    POLL_OPTIONS: ["כן", "בדרך", "לא"],
    POLL_QUESTION: "האם כולם באיזור בטוח?"
};