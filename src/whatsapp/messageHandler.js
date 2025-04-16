const { log, LOG_LEVELS } = require('../utils/logger');
const config = require('../config');
const { targetGroupIds } = require('../services/pollService');

/**
 * Sets up message handling for incoming WhatsApp messages
 * @param {Object} sock - The WhatsApp socket connection
 */
function setupMessageHandler(sock) {
    sock.ev.on('messages.upsert', async (messageUpdate) => {
        for (const message of messageUpdate.messages) {
            // Only process messages sent by the active user to groups
            if (message.key.fromMe && message.key.remoteJid.endsWith('@g.us')) {
                const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text;
                const groupId = message.key.remoteJid;
                
                if (config.ON_GROUP_MARKER === messageContent && !targetGroupIds.has(groupId)) {
                    log(LOG_LEVELS.INFO, 'Found ON marker in some group. Activating bot for it.');
                    targetGroupIds.add(groupId);
                }
                else if (config.OFF_GROUP_MARKER === messageContent && targetGroupIds.has(groupId)) {
                    log(LOG_LEVELS.INFO, 'Found OFF marker in some controlled group. Deactivating bot for it.');
                    targetGroupIds.delete(groupId);
                }
            }
        }
    });
}

module.exports = { setupMessageHandler };