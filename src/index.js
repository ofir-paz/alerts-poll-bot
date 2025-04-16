const { log, LOG_LEVELS } = require('./utils/logger');
const { startBot } = require('./whatsapp/client');

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    log(LOG_LEVELS.ERROR, 'Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
    log(LOG_LEVELS.ERROR, 'Uncaught Exception:', error);
});

// Start the bot
log(LOG_LEVELS.INFO, 'Starting AlertsPollBot...');
startBot();