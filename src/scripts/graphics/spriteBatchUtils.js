"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const color_1 = require("../common/color");
const type0Shade = color_1.colorToFloat(color_1.colorFromRGBA(255, 0, 0, 0));
const type2Shade = color_1.colorToFloat(color_1.colorFromRGBA(0, 0, 255, 0));
const type3Shade = color_1.colorToFloat(color_1.colorFromRGBA(0, 0, 0, 0));
const type0 = color_1.colorToFloat(color_1.colorFromRGBA(255, 0, 0, 255));
const type1 = color_1.colorToFloat(color_1.colorFromRGBA(0, 255, 0, 255));
const type2 = color_1.colorToFloat(color_1.colorFromRGBA(0, 0, 255, 255));
const type3 = color_1.colorToFloat(color_1.colorFromRGBA(0, 0, 0, 255));
exports.paletteSpriteTypes = [type0Shade, type2Shade, type3Shade, type0, type1, type2, type3];
//# sourceMappingURL=spriteBatchUtils.js.map