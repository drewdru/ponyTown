import { colorToFloat, colorFromRGBA } from '../common/color';

const type0Shade = colorToFloat(colorFromRGBA(255, 0, 0, 0));
const type2Shade = colorToFloat(colorFromRGBA(0, 0, 255, 0));
const type3Shade = colorToFloat(colorFromRGBA(0, 0, 0, 0));

const type0 = colorToFloat(colorFromRGBA(255, 0, 0, 255));
const type1 = colorToFloat(colorFromRGBA(0, 255, 0, 255));
const type2 = colorToFloat(colorFromRGBA(0, 0, 255, 255));
const type3 = colorToFloat(colorFromRGBA(0, 0, 0, 255));

export const paletteSpriteTypes = [type0Shade, type2Shade, type3Shade, type0, type1, type2, type3];
