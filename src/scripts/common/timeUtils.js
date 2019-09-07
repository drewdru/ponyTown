"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const color_1 = require("./color");
const colors_1 = require("./colors");
const constants_1 = require("./constants");
const DAY_START = 4.75; // 04:45
const DAY_END = 20.25; // 20:15
const SUN_EASE = 1.5; // 01:30
const SUN_HALF = SUN_EASE / 2;
const SUN_GAP = SUN_EASE / 4;
exports.HOUR_LENGTH = 2 * constants_1.MINUTE; // 48 min -> 24 hours
exports.DAY_LENGTH = exports.HOUR_LENGTH * 24;
const getTimeOfDay = (time) => time % exports.DAY_LENGTH;
const getHourOfDay = (timeOfDay) => timeOfDay * 24 / exports.DAY_LENGTH;
function getHour(time) {
    const timeOfDay = getTimeOfDay(time);
    const hourOfDay = getHourOfDay(timeOfDay);
    return hourOfDay;
}
exports.getHour = getHour;
function formatHourMinutes(time) {
    const timeOfDay = getTimeOfDay(time);
    const minutesInDay = 60 * 24;
    const totalMinutes = Math.floor(timeOfDay * minutesInDay / exports.DAY_LENGTH);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
exports.formatHourMinutes = formatHourMinutes;
const isHour = (test) => (time) => {
    return test(getHour(time));
};
exports.isDay = isHour(hour => hour > DAY_START && hour <= DAY_END);
exports.isNight = (time) => !exports.isDay(time);
exports.isFullDay = isHour(hour => hour > (DAY_START + SUN_HALF) && hour <= (DAY_END - SUN_HALF));
exports.isFullNight = isHour(hour => hour < (DAY_START - SUN_HALF) || hour >= (DAY_END + SUN_HALF));
exports.isSunRaising = isHour(hour => hour > (DAY_START - SUN_HALF) && hour <= (DAY_START + SUN_HALF));
exports.isSunSetting = isHour(hour => hour > (DAY_END - SUN_HALF) && hour <= (DAY_END + SUN_HALF));
exports.isDayTime = isHour(hour => hour > DAY_START && hour < (DAY_END - SUN_HALF));
exports.isNightTime = isHour(hour => hour < (DAY_START - SUN_HALF) || hour > DAY_END);
function createLightData(season) {
    const lightDay = colors_1.WHITE;
    const lightNight = season === 4 /* Winter */ ? 0x253f76ff : 0x2b3374ff;
    const sunrise1 = 0x853d7dff;
    const sunrise2 = 0xc96161ff;
    const sunrise3 = 0xeeb7a0ff;
    const sunset1 = sunrise3;
    const sunset2 = sunrise2;
    const sunset3 = sunrise1;
    const shadowAlphaMultiplier = season === 4 /* Winter */ ? 0.7 : 1;
    const shadowDay = color_1.withAlphaFloat(colors_1.BLACK, 0.3 * shadowAlphaMultiplier);
    const shadowNight = color_1.withAlphaFloat(colors_1.BLACK, 0.2 * shadowAlphaMultiplier);
    const shadowSunset = color_1.withAlphaFloat(colors_1.BLACK, 0.25 * shadowAlphaMultiplier);
    const shadowSunrise = color_1.withAlphaFloat(colors_1.BLACK, 0.25 * shadowAlphaMultiplier);
    const lightPoints = [
        // night
        { time: 0, light: lightNight, shadow: shadowNight },
        // transition to day
        { time: DAY_START - SUN_HALF, light: lightNight, shadow: shadowNight },
        { time: DAY_START - SUN_HALF + SUN_GAP, light: sunrise1, shadow: shadowSunrise },
        { time: DAY_START - SUN_HALF + SUN_GAP * 2, light: sunrise2, shadow: shadowSunrise },
        { time: DAY_START - SUN_HALF + SUN_GAP * 3, light: sunrise3, shadow: shadowSunrise },
        { time: DAY_START + SUN_HALF, light: lightDay, shadow: shadowDay },
        // transition to night
        { time: DAY_END - SUN_HALF, light: lightDay, shadow: shadowDay },
        { time: DAY_END - SUN_HALF + SUN_GAP, light: sunset1, shadow: shadowSunset },
        { time: DAY_END - SUN_HALF + SUN_GAP * 2, light: sunset2, shadow: shadowSunset },
        { time: DAY_END - SUN_HALF + SUN_GAP * 3, light: sunset3, shadow: shadowSunset },
        { time: DAY_END + SUN_HALF, light: lightNight, shadow: shadowNight },
        // night
        { time: 24, light: lightNight, shadow: shadowNight },
    ];
    const lightColors = lightPoints.map(l => l.light);
    const shadowColors = lightPoints.map(l => l.shadow);
    const lightStops = lightPoints.map(l => l.time);
    return { lightColors, shadowColors, lightStops };
}
exports.createLightData = createLightData;
function getLightColor(data, time) {
    return getColorForTime(time, data.lightStops, data.lightColors, colors_1.WHITE);
}
exports.getLightColor = getLightColor;
function getShadowColor(data, time) {
    return getColorForTime(time, data.lightStops, data.shadowColors, colors_1.SHADOW_COLOR);
}
exports.getShadowColor = getShadowColor;
function getColorForTime(time, stops, colors, defaultColor) {
    const timeOfDay = getTimeOfDay(time);
    const hourOfDay = getHourOfDay(timeOfDay);
    for (let i = 1; i < stops.length; i++) {
        if (stops[i] >= hourOfDay) {
            const from = stops[i - 1];
            const to = stops[i];
            const fromLight = colors[i - 1];
            const toLight = colors[i];
            return color_1.lerpColors(fromLight, toLight, (hourOfDay - from) / (to - from));
        }
    }
    return defaultColor;
}
//# sourceMappingURL=timeUtils.js.map