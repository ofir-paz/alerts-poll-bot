require('dotenv').config(); // Load environment variables
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const duration = require("dayjs/plugin/duration");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

// Configure plugins
dayjs.extend(duration);
dayjs.extend(customParseFormat);

// Configure logger
const LOG_LEVELS = {
    INFO: { prefix: '[INFO]' },
    SUCCESS: { prefix: '[SUCCESS]' },
    WARNING: { prefix: '[WARNING]' },
    ERROR: { prefix: '[ERROR]' }
};

const log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = level.prefix;
    
    console.log(`[${timestamp}] ${prefix} | ${message}`);
    if (data) {
        const padding = ' '.repeat(timestamp.length + 3);
        console.log(`${padding}| Additional data:`, data);
    }
};

// Configuration
const ON_GROUP_MARKER = process.env.ON_GROUP_MARKER || "alerts-poll-bot-on";
const OFF_GROUP_MARKER = process.env.OFF_GROUP_MARKER || "alerts-poll-bot-off";
const CITY_NAME = process.env.CITY_NAME;
const POLL_INTERVAL_MINUTES = parseInt(process.env.POLL_INTERVAL_MINUTES || "15");
const AUTH_FOLDER = process.env.AUTH_FOLDER || 'auth_info';
const ALERT_CHECK_INTERVAL_MS = parseInt(process.env.ALERT_CHECK_INTERVAL_MS || "15000");

let targetGroupIds = new Set([]);  // Will be populated after finding the group
let lastTimeSent = dayjs(0);  // Last time the poll was sent

// This async function starts the bot
async function startBot(){
    
    try {
        log(LOG_LEVELS.INFO, "Initializing WhatsApp connection...");
        // Create or load your authentication state
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        log(LOG_LEVELS.INFO, `Auth state loaded from ${AUTH_FOLDER}`);

        // Create the WhatsApp socket (connection)
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['AlertPollBot', 'Chrome', '1.0']
        });
        log(LOG_LEVELS.INFO, "WhatsApp socket created");

        // Save credentials whenever they get updated
        sock.ev.on('creds.update', () => {
            saveCreds();
            log(LOG_LEVELS.INFO, "Credentials updated and saved");
        });

        // Listen to connection updates
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.toString() || "Unknown error";
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                log(LOG_LEVELS.WARN, `Connection closed: ${errorMessage}`, { statusCode });
                
                if (shouldReconnect) {
                    log(LOG_LEVELS.INFO, "Attempting to reconnect in 10 seconds...");
                    setTimeout(() => startBot(), 10000);
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
            log(LOG_LEVELS.INFO, "Attempting to reconnect in 10 seconds...");
            setTimeout(() => startBot(), 10000);
        });

        sock.ev.on('messages.upsert', async (messageUpdate) => {
            for (const message of messageUpdate.messages) {
                // Only process messages sent by the active user to groups
                if (message.key.fromMe && message.key.remoteJid.endsWith('@g.us')) {
                    const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text;
                    const groupId = message.key.remoteJid;
                    if (ON_GROUP_MARKER === messageContent && !targetGroupIds.has(groupId)) {
                        log(LOG_LEVELS.INFO, 'Found ON marker in some group. Activating bot for it.');
                        targetGroupIds.add(groupId);
                    }
                    else if (OFF_GROUP_MARKER === messageContent && targetGroupIds.has(groupId)) {
                        log(LOG_LEVELS.INFO, 'Found OFF marker in some controlled group. Deactivating bot for it.');
                        targetGroupIds.delete(groupId);
                    }
                }
            }
        });

    } catch (error) {
        log(LOG_LEVELS.ERROR, "Failed to start the bot", error);
        log(LOG_LEVELS.INFO, "Attempting to restart in 5 seconds...");
        setTimeout(() => startBot(), 5000);
    }
}

async function managePollSending(sock) {
    try {
        while (true) {
            if (targetGroupIds.size !== 0) {
                const now = dayjs();
                
                if (await shouldSendPoll(now, lastTimeSent)) {
                    log(LOG_LEVELS.INFO, `Sending poll at: ${now.format('DD-MM-YYYY HH:mm:ss')}`);
                    await sendPoll(sock);
                    lastTimeSent = now;
                }
            }
            else {
                log(LOG_LEVELS.INFO, 'No active groups found. Waiting for activation...');
            }
            await new Promise(r => setTimeout(r, ALERT_CHECK_INTERVAL_MS));
        }
    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Error in poll management:', error);
        // Restart the poll sending process
        setTimeout(() => managePollSending(sock), 5000);
    }
}

async function sendPoll(sock) {
    const pollMessage = {
        poll: {
            name: "האם כולם באיזור בטוח?",
            values: ["כן", "בדרך", "לא"],
            selectableCount: 1,
            toAnnouncementGroup: true
        }
    };
    
    let i = 0;
    for (const groupId of targetGroupIds) {
        try {
            await sock.sendMessage(groupId, pollMessage);
            log(LOG_LEVELS.SUCCESS, `[${++i}\\${targetGroupIds.size}] Poll sent successfully!`);
            return true;
        } catch (error) {
            log(LOG_LEVELS.ERROR, `[${++i}\\${targetGroupIds.size}] Failed to send poll:`, error);
            return false;
        }
    }
}

async function shouldSendPoll(currentTime, lastTimeSent) {
    try {
        // Check if enough time has passed since the last poll was sent
        const isEnoughTimePassed = currentTime.diff(lastTimeSent, "minute", true) >= POLL_INTERVAL_MINUTES;
        
        if (isEnoughTimePassed) {
            const timeToCheck = currentTime.subtract(1, "minute");
            const timeOffset = dayjs.duration(1, 'minute');
            const alertsInCity = await checkIfAlertByHistoric(CITY_NAME, timeToCheck, timeOffset);

            // Check if there are alerts in the city within the last 1 minute
            if (alertsInCity.length > 0) {
                log(LOG_LEVELS.INFO, `Alert found in city: ${JSON.stringify(alertsInCity[0])}`);
                return true;
            }
            else {
                log(LOG_LEVELS.INFO, `No alerts found in ${CITY_NAME} within the last minutes.`);
            }
        }

        return false;
    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Error checking if poll should be sent:', error);
        return false;
    }
}

async function checkIfAlertByHistoric(cityName = CITY_NAME, timeToCheck = null, timeOffset = dayjs.duration(1, 'minute')) {
    try {
        // If timeToCheck is not provided, set it to the current time minus 1 minute
        if (timeToCheck === null) {
            timeToCheck = dayjs().subtract(1, 'minute');
        } else if (!dayjs.isDayjs(timeToCheck)) {
            // If timeToCheck is provided as a Unix timestamp (in seconds), convert it to a dayjs object
            timeToCheck = dayjs.unix(timeToCheck);
        }
    
        const returnList = [];
        const historyData = await getHistoryData();
        
        if (!historyData || !Array.isArray(historyData)) {
            log(LOG_LEVELS.WARNING, 'Invalid history data received');
            return [];
        }

        for (const alertObject of historyData) {
            if (!alertObject.alertDate || !alertObject.data) continue;
            
            // Parse the alert date from the format "YYYY-MM-DD HH:mm:ss"
            const alertTime = dayjs(alertObject.alertDate, "YYYY-MM-DD HH:mm:ss");
            
            // Check if alertTime is within the time window and matches the city
            if (
                alertTime.isAfter(timeToCheck.subtract(timeOffset)) &&
                alertTime.isBefore(timeToCheck.add(timeOffset)) &&
                alertObject.data === cityName
            ) {
                returnList.push(alertObject);
            }
        }
        return returnList;
    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Error checking for alerts:', error);
        return [];
    }
}

async function getHistoryData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch("https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json", {
            headers: { 'Referer': 'https://www.oref.org.il/heb' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof SyntaxError && error.message.includes('Unexpected end of JSON input')) {
            // Silently return empty array for this specific error
            // This is a bug in the OREF API that returns an empty response when there are no alerts
            // in the last 24 hours.
            return [];
        }
        log(LOG_LEVELS.ERROR, "Error fetching alert data:", error);
        return [];
    }
}

log(LOG_LEVELS.INFO, 'Starting AlertPollBot...');
startBot();