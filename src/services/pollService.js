const { log, LOG_LEVELS } = require('../utils/logger');
const { dayjs } = require('../utils/timeUtils');
const config = require('../config');
const { checkIfAlertByHistoric } = require('./alertService');

// Track active groups and last poll time
let targetGroupIds = new Set([]);
let lastTimeSent = dayjs(0);

function createPoll() {
    return {
        poll: {
            name: config.POLL_QUESTION,
            values: config.POLL_OPTIONS,
            selectableCount: 1,
            toAnnouncementGroup: true
        }
    };
}

async function sendPoll(sock) {
    const pollMessage = createPoll();
    
    let i = 1;
    for (const groupId of targetGroupIds) {
        try {
            await sock.sendMessage(groupId, pollMessage);
            log(LOG_LEVELS.SUCCESS, `[${i++}\\${targetGroupIds.size}] Poll sent successfully!`);
        } catch (error) {
            log(LOG_LEVELS.ERROR, `[${i++}\\${targetGroupIds.size}] Failed to send poll:`, error);
        }
    }
}

async function shouldSendPoll(currentTime, lastTimeSent) {
    try {
        // Check if enough time has passed since the last poll was sent
        const isEnoughTimePassed = currentTime.diff(lastTimeSent, "minute", true) >= config.POLL_INTERVAL_MINUTES;
        
        if (isEnoughTimePassed) {
            const timeToCheck = currentTime.clone().subtract(1, "minute");
            const alertsInCity = await checkIfAlertByHistoric(config.CITY_NAME, timeToCheck, 1);

            // Check if there are alerts in the city within the last 1 minute
            if (alertsInCity.length > 0) {
                log(LOG_LEVELS.INFO, `Alert found in city: ${JSON.stringify(alertsInCity[0])}`);
                return true;
            }
            else {
                // For debugging purposes
                // log(LOG_LEVELS.INFO, `No alerts found in ${config.CITY_NAME} within the last minutes.`);
            }
        }

        return false;
    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Error checking if poll should be sent:', error);
        return false;
    }
}

async function managePollSending(sock) {
    try {
        while (true) {
            if (targetGroupIds.size !== 0) {
                const now = dayjs();
                
                if (true || await shouldSendPoll(now, lastTimeSent)) {
                    log(LOG_LEVELS.INFO, `Sending poll at: ${now.format('DD-MM-YYYY HH:mm:ss')}`);
                    await sendPoll(sock);
                    lastTimeSent = now;
                }
            }
            else {
                log(LOG_LEVELS.INFO, 'No active groups found. Waiting for activation...');
            }
            await new Promise(r => setTimeout(r, config.ALERT_CHECK_INTERVAL_MS));
        }
    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Error in poll management:', error);
        // Restart the poll sending process
        setTimeout(() => managePollSending(sock), 5000);
    }
}

module.exports = {
    targetGroupIds,
    managePollSending,
    sendPoll
};