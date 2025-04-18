const LOG_LEVELS = {
    INFO: { prefix: '[INFO]' },
    SUCCESS: { prefix: '[SUCCESS]' },
    WARNING: { prefix: '[WARNING]' },
    ERROR: { prefix: '[ERROR]' }
};

function log(level, message, data = null) {
    const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const prefix = level.prefix;
    
    console.log(`[${timestamp}] ${prefix} | ${message}`);
    if (data) {
        const padding = ' '.repeat(timestamp.length + 3);
        console.log(`${padding}| Additional data:`, data);
    }
}

module.exports = {
    LOG_LEVELS,
    log,
    info: (message, data) => log(LOG_LEVELS.INFO, message, data),
    success: (message, data) => log(LOG_LEVELS.SUCCESS, message, data),
    warning: (message, data) => log(LOG_LEVELS.WARNING, message, data),
    error: (message, data) => log(LOG_LEVELS.ERROR, message, data)
};