"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const timeUtils_1 = require("../../common/timeUtils");
const colors_1 = require("../../common/colors");
const LIGHT_DAY = colors_1.WHITE;
const LIGHT_NIGHT = 0x2b3374ff;
describe('timeUtils', () => {
    let lightData;
    beforeEach(() => {
        lightData = timeUtils_1.createLightData(8 /* Spring */);
    });
    describe('getLightColor()', () => {
        it('returns day light in day time', () => {
            chai_1.expect(timeUtils_1.getLightColor(lightData, 12 * timeUtils_1.HOUR_LENGTH)).equal(LIGHT_DAY);
        });
        it('returns night light in night time', () => {
            chai_1.expect(timeUtils_1.getLightColor(lightData, 0)).equal(LIGHT_NIGHT);
        });
    });
    describe('formatHourMinutes()', () => {
        it('formats hour and minute for the in-game day', () => {
            chai_1.expect(timeUtils_1.formatHourMinutes(948765)).equal('07:54');
        });
    });
    describe('isDay()', () => {
        it('returns true if daytime', () => {
            chai_1.expect(timeUtils_1.isDay(12 * timeUtils_1.HOUR_LENGTH)).true;
        });
        it('returns falst if not daytime', () => {
            chai_1.expect(timeUtils_1.isDay(0)).false;
        });
    });
    describe('isNight()', () => {
        it('returns true if not daytime', () => {
            chai_1.expect(timeUtils_1.isNight(12 * timeUtils_1.HOUR_LENGTH)).false;
        });
        it('returns falst if daytime', () => {
            chai_1.expect(timeUtils_1.isNight(0)).true;
        });
    });
});
//# sourceMappingURL=timeUtils.spec.js.map