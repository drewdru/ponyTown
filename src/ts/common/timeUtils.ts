import { lerpColors, withAlphaFloat } from './color';
import { WHITE, SHADOW_COLOR, BLACK } from './colors';
import { MINUTE } from './constants';
import { Season } from './interfaces';

const DAY_START = 4.75; // 04:45
const DAY_END = 20.25; // 20:15
const SUN_EASE = 1.5; // 01:30
const SUN_HALF = SUN_EASE / 2;
const SUN_GAP = SUN_EASE / 4;

export const HOUR_LENGTH = 2 * MINUTE; // 48 min -> 24 hours
export const DAY_LENGTH = HOUR_LENGTH * 24;

const getTimeOfDay = (time: number) => time % DAY_LENGTH;
const getHourOfDay = (timeOfDay: number) => timeOfDay * 24 / DAY_LENGTH;

export function getHour(time: number) {
	const timeOfDay = getTimeOfDay(time);
	const hourOfDay = getHourOfDay(timeOfDay);
	return hourOfDay;
}

export function formatHourMinutes(time: number): string {
	const timeOfDay = getTimeOfDay(time);
	const minutesInDay = 60 * 24;
	const totalMinutes = Math.floor(timeOfDay * minutesInDay / DAY_LENGTH);
	const minutes = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

const isHour = (test: (hour: number) => boolean) => (time: number) => {
	return test(getHour(time));
};

export const isDay = isHour(hour => hour > DAY_START && hour <= DAY_END);
export const isNight = (time: number) => !isDay(time);

export const isFullDay = isHour(hour => hour > (DAY_START + SUN_HALF) && hour <= (DAY_END - SUN_HALF));
export const isFullNight = isHour(hour => hour < (DAY_START - SUN_HALF) || hour >= (DAY_END + SUN_HALF));

export const isSunRaising = isHour(hour => hour > (DAY_START - SUN_HALF) && hour <= (DAY_START + SUN_HALF));
export const isSunSetting = isHour(hour => hour > (DAY_END - SUN_HALF) && hour <= (DAY_END + SUN_HALF));

export const isDayTime = isHour(hour => hour > DAY_START && hour < (DAY_END - SUN_HALF));
export const isNightTime = isHour(hour => hour < (DAY_START - SUN_HALF) || hour > DAY_END);

// light color

export interface LightData {
	lightColors: number[];
	shadowColors: number[];
	lightStops: number[];
}

export function createLightData(season: Season): LightData {
	const lightDay = WHITE;
	const lightNight = season === Season.Winter ? 0x253f76ff : 0x2b3374ff;

	const sunrise1 = 0x853d7dff;
	const sunrise2 = 0xc96161ff;
	const sunrise3 = 0xeeb7a0ff;

	const sunset1 = sunrise3;
	const sunset2 = sunrise2;
	const sunset3 = sunrise1;

	const shadowAlphaMultiplier = season === Season.Winter ? 0.7 : 1;
	const shadowDay = withAlphaFloat(BLACK, 0.3 * shadowAlphaMultiplier);
	const shadowNight = withAlphaFloat(BLACK, 0.2 * shadowAlphaMultiplier);
	const shadowSunset = withAlphaFloat(BLACK, 0.25 * shadowAlphaMultiplier);
	const shadowSunrise = withAlphaFloat(BLACK, 0.25 * shadowAlphaMultiplier);

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

export function getLightColor(data: LightData, time: number): number {
	return getColorForTime(time, data.lightStops, data.lightColors, WHITE);
}

export function getShadowColor(data: LightData, time: number): number {
	return getColorForTime(time, data.lightStops, data.shadowColors, SHADOW_COLOR);
}

function getColorForTime(time: number, stops: number[], colors: number[], defaultColor: number) {
	const timeOfDay = getTimeOfDay(time);
	const hourOfDay = getHourOfDay(timeOfDay);

	for (let i = 1; i < stops.length; i++) {
		if (stops[i] >= hourOfDay) {
			const from = stops[i - 1];
			const to = stops[i];
			const fromLight = colors[i - 1];
			const toLight = colors[i];
			return lerpColors(fromLight, toLight, (hourOfDay - from) / (to - from));
		}
	}

	return defaultColor;
}
