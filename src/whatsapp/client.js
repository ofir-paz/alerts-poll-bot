const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const { log, LOG_LEVELS } = require('../utils/logger');
const config = require('../config');
const { setupMessageHandler } = require('./messageHandler');
const { managePollSending } = require('../services/pollService');

/**
 * Initializes and manages WhatsApp connection
 */
async function startBot() {
    try {
        log(LOG_LEVELS.INFO, "Initializing WhatsApp connection...");
        // Create or load your authentication state
        const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_FOLDER);
        log(LOG_LEVELS.INFO, `Auth state loaded from ${config.AUTH_FOLDER}`);

        // Create the WhatsApp socket (connection)
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['AlertsPollBot', 'Chrome', '1.0']
        });
        log(LOG_LEVELS.INFO, "WhatsApp socket created");

        // Save credentials whenever they get updated
        sock.ev.on('creds.update', () => {
            saveCreds();
            log(LOG_LEVELS.INFO, "Credentials updated and saved");
        });

        // Set up message handler
        setupMessageHandler(sock);

        // Listen to connection updates
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.toString() || "Unknown error";
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                log(LOG_LEVELS.WARNING, `Connection closed: ${errorMessage}`, { statusCode });
                
                if (shouldReconnect) {
                    log(LOG_LEVELS.INFO, `Attempting to reconnect in ${config.RECONNECT_INTERVAL_MS/1000} seconds...`);
                    setTimeout(() => startBot(), config.RECONNECT_INTERVAL_MS);
                } else {
                    log(LOG_LEVELS.ERROR, "Logged out. Not attempting to reconnect.");
                }
            } else if (connection === 'open') {
                log(LOG_LEVELS.SUCCESS, "Successfully connected to WhatsApp!");
                managePollSending(sock);
            }
        });
        
        // Handle any errors
        sock.ev.on('error', (err) => {
            log(LOG_LEVELS.ERROR, "Socket error occurred", err);
            log(LOG_LEVELS.INFO, `Attempting to reconnect in ${config.RECONNECT_INTERVAL_MS/1000} seconds...`);
            setTimeout(() => startBot(), config.RECONNECT_INTERVAL_MS);
        });

    } catch (error) {
        log(LOG_LEVELS.ERROR, "Failed to start the bot", error);
        log(LOG_LEVELS.INFO, "Attempting to restart in 5 seconds...");
        setTimeout(() => startBot(), 5000);
    }
}

module.exports = { startBot };