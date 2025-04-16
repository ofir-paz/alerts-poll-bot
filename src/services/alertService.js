const { log, LOG_LEVELS } = require('../utils/logger');
const { dayjs, createTimeWindow } = require('../utils/timeUtils');
const config = require('../config');

async function getHistoryData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.ALERT_API_TIMEOUT_MS);
        
        const response = await fetch(config.ALERT_API_URL, {
            headers: { 'Referer': config.ALERT_API_REFERER },
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
            return [];
        }
        log(LOG_LEVELS.ERROR, "Error fetching alert data:", error);
        return [];
    }
}

async function checkIfAlertByHistoric(cityName = config.CITY_NAME, timeToCheck = null, timeOffsetMinutes = 1) {
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

        // Create time window with safe cloning
        const { start: windowStart, end: windowEnd } = createTimeWindow(timeToCheck, timeOffsetMinutes);

        for (const alertObject of historyData) {
            if (!alertObject.alertDate || !alertObject.data) continue;
            
            // Parse the alert date from the format "YYYY-MM-DD HH:mm:ss"
            const alertTime = dayjs(alertObject.alertDate, "YYYY-MM-DD HH:mm:ss");
            
            // Check if alertTime is within the time window and matches the city
            if (
                alertTime.isAfter(windowStart) &&
                alertTime.isBefore(windowEnd) &&
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

module.exports = {
    getHistoryData,
    checkIfAlertByHistoric
};