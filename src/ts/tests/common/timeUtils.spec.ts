import '../lib';
import { expect } from 'chai';
import {
	formatHourMinutes, getLightColor, HOUR_LENGTH, isDay, isNight, LightData, createLightData
} from '../../common/timeUtils';
import { WHITE } from '../../common/colors';
import { Season } from '../../common/interfaces';

const LIGHT_DAY = WHITE;
const LIGHT_NIGHT = 0x2b3374ff;

describe('timeUtils', () => {
	let lightData: LightData;

	beforeEach(() => {
		lightData = createLightData(Season.Spring);
	});

	describe('getLightColor()', () => {
		it('returns day light in day time', () => {
			expect(getLightColor(lightData, 12 * HOUR_LENGTH)).equal(LIGHT_DAY);
		});

		it('returns night light in night time', () => {
			expect(getLightColor(lightData, 0)).equal(LIGHT_NIGHT);
		});
	});

	describe('formatHourMinutes()', () => {
		it('formats hour and minute for the in-game day', () => {
			expect(formatHourMinutes(948765)).equal('07:54');
		});
	});

	describe('isDay()', () => {
		it('returns true if daytime', () => {
			expect(isDay(12 * HOUR_LENGTH)).true;
		});

		it('returns falst if not daytime', () => {
			expect(isDay(0)).false;
		});
	});

	describe('isNight()', () => {
		it('returns true if not daytime', () => {
			expect(isNight(12 * HOUR_LENGTH)).false;
		});

		it('returns falst if daytime', () => {
			expect(isNight(0)).true;
		});
	});
});
