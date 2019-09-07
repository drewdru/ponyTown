"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const colors_1 = require("../../common/colors");
describe('colors', () => {
    describe('fillToOutline()', () => {
        it('returns undefined for undefined', () => {
            chai_1.expect(colors_1.fillToOutline(undefined)).undefined;
        });
        it('returns outline color', () => {
            chai_1.expect(colors_1.fillToOutline('ff0000')).equals('b30000');
        });
    });
    describe('fillToOutlineColor()', () => {
        it('returns outline color', () => {
            chai_1.expect(colors_1.fillToOutlineColor(0xff0000ff)).equals(0xb30000ff);
        });
    });
    describe('getMessageColor()', () => {
        it('returns correct color for each message type', () => {
            chai_1.expect(colors_1.getMessageColor(1 /* System */)).equals(colors_1.SYSTEM_COLOR);
            chai_1.expect(colors_1.getMessageColor(2 /* Admin */)).equals(colors_1.ADMIN_COLOR);
            chai_1.expect(colors_1.getMessageColor(3 /* Mod */)).equals(colors_1.MOD_COLOR);
            chai_1.expect(colors_1.getMessageColor(7 /* Announcement */)).equals(colors_1.ANNOUNCEMENT_COLOR);
            chai_1.expect(colors_1.getMessageColor(4 /* Party */)).equals(colors_1.PARTY_COLOR);
            chai_1.expect(colors_1.getMessageColor(5 /* Thinking */)).equals(colors_1.THINKING_COLOR);
            chai_1.expect(colors_1.getMessageColor(6 /* PartyThinking */)).equals(colors_1.PARTY_THINKING_COLOR);
            chai_1.expect(colors_1.getMessageColor(9 /* Supporter1 */)).equals(colors_1.SUPPORTER1_COLOR);
            chai_1.expect(colors_1.getMessageColor(10 /* Supporter2 */)).equals(colors_1.SUPPORTER2_COLOR);
            chai_1.expect(colors_1.getMessageColor(11 /* Supporter3 */)).equals(colors_1.SUPPORTER3_COLOR);
        });
        it('returns white color for other types', () => {
            chai_1.expect(colors_1.getMessageColor(0 /* Chat */)).equals(colors_1.WHITE);
            chai_1.expect(colors_1.getMessageColor(999)).equals(colors_1.WHITE);
        });
    });
});
//# sourceMappingURL=colors.spec.js.map