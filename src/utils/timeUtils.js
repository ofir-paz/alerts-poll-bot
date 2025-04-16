const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const duration = require("dayjs/plugin/duration");

// Configure plugins
dayjs.extend(duration);
dayjs.extend(customParseFormat);

module.exports = {
    dayjs,
    duration: dayjs.duration,
    createTimeWindow: (centerTime, offsetMinutes = 1) => {
        const center = dayjs.isDayjs(centerTime) ? centerTime.clone() : dayjs(centerTime);
        const offset = dayjs.duration(offsetMinutes, 'minute');
        
        return {
            start: center.clone().subtract(offset),
            end: center.clone().add(offset),
            center
        };
    }
};