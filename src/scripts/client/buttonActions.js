"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const interfaces_1 = require("../common/interfaces");
const sprites = require("../generated/sprites");
const clientUtils_1 = require("./clientUtils");
const expressionEncoder_1 = require("../common/encoders/expressionEncoder");
const playerActions_1 = require("./playerActions");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const ponyAnimations_1 = require("./ponyAnimations");
const ponyInfo_1 = require("../common/ponyInfo");
const colors_1 = require("../common/colors");
const canvasUtils_1 = require("./canvasUtils");
const contextSpriteBatch_1 = require("../graphics/contextSpriteBatch");
const ponyHelpers_1 = require("./ponyHelpers");
const ponyDraw_1 = require("./ponyDraw");
const color_1 = require("../common/color");
const rect_1 = require("../common/rect");
const spriteFont_1 = require("../graphics/spriteFont");
const fonts_1 = require("../client/fonts");
const entityUtils_1 = require("../common/entityUtils");
const pony_1 = require("../common/pony");
const entities_1 = require("../common/entities");
const mixins_1 = require("../common/mixins");
const spriteUtils_1 = require("./spriteUtils");
const model_1 = require("../components/services/model");
const positionUtils_1 = require("../common/positionUtils");
const CANVAS_SIZE = 29;
const ICON_SIZE = 16;
const headX = -26;
const headY = -30;
const headlessBoopFrame = Object.assign({}, utils_1.cloneDeep(ponyAnimations_1.boop.frames[7]), { head: 0 });
const headlessBoop = { name: '', loop: false, fps: 1, frames: [headlessBoopFrame] };
function createPony(coatColor, wings = false, horn = false) {
    const info = ponyInfo_1.createDefaultPony();
    info.coatFill = coatColor;
    info.mane.type = 0;
    info.backMane.type = 0;
    info.tail.type = 0;
    info.eyeColorRight = colors_1.ACTION_EXPRESSION_EYE_COLOR;
    if (wings) {
        info.wings.type = 1;
    }
    if (horn) {
        info.horn.type = 1;
    }
    ponyInfo_1.syncLockedPonyInfo(info);
    return ponyInfo_1.toPalette(info, ponyInfo_1.mockPaletteManager);
}
function createState() {
    const state = ponyHelpers_1.defaultPonyState();
    state.blushColor = colors_1.blushColor(color_1.parseColor(colors_1.ACTION_ACTION_COAT_COLOR));
    return state;
}
function colorToGrayscale(value) {
    return color_1.colorToHexRGB(color_1.toGrayscale(color_1.parseColor(value)));
}
const ACTION_ACTION_BG_DISABLED = color_1.toGrayscale(color_1.parseColor(colors_1.ACTION_ACTION_BG));
const expressionPony = createPony(colors_1.ACTION_EXPRESSION_BG);
const actionPony = createPony(colors_1.ACTION_ACTION_COAT_COLOR);
const actionPonyWithHorn = createPony(colors_1.ACTION_ACTION_COAT_COLOR, false, true);
const actionPonyWithWings = createPony(colors_1.ACTION_ACTION_COAT_COLOR, true);
const actionPonyDisabled = createPony(colorToGrayscale(colors_1.ACTION_ACTION_COAT_COLOR));
const actionPonyWithWingsDisabled = createPony(colorToGrayscale(colors_1.ACTION_ACTION_COAT_COLOR), true);
const defaultPalette = ponyInfo_1.mockPaletteManager.addArray(sprites.defaultPalette);
exports.actionExpressionDefaultPalette = ponyInfo_1.mockPaletteManager.add(Array.from(sprites.defaultPalette));
expressionPony.defaultPalette = exports.actionExpressionDefaultPalette;
expressionPony.defaultPalette.colors[4] = 0xe16200ff; // tongue color
function expressionButtonAction(expression) {
    return { type: 'expression', expression, title: expression ? '' : 'Reset expression' };
}
exports.expressionButtonAction = expressionButtonAction;
function commandButtonAction(command, icon) {
    return { type: 'command', command, title: command, icon };
}
exports.commandButtonAction = commandButtonAction;
function actionButtonAction(action, title, sendAction = 0 /* None */) {
    return { type: 'action', action, title, sendAction };
}
exports.actionButtonAction = actionButtonAction;
function itemButtonAction(icon, count) {
    return { type: 'item', icon, count };
}
exports.itemButtonAction = itemButtonAction;
function entityButtonAction(entity) {
    return { type: 'entity', entity, title: entity };
}
exports.entityButtonAction = entityButtonAction;
const actionActions = [
    actionButtonAction('boop', 'Boop'),
    actionButtonAction('down', 'Sit down / Land'),
    actionButtonAction('up', 'Stand up / Fly up'),
    actionButtonAction('turn-head', 'Turn head'),
    actionButtonAction('sneeze', 'Sneeze', 5 /* Sneeze */),
    actionButtonAction('sleep', 'Sleep', 13 /* Sleep */),
    actionButtonAction('yawn', 'Yawn', 3 /* Yawn */),
    actionButtonAction('love', 'Love', 18 /* Love */),
    actionButtonAction('laugh', 'Laugh', 4 /* Laugh */),
    actionButtonAction('blush', 'Blush', 16 /* Blush */),
    actionButtonAction('drop', 'Drop item', 14 /* Drop */),
    actionButtonAction('drop-toy', 'Drop toy', 15 /* DropToy */),
    actionButtonAction('magic', 'Magic', 26 /* Magic */),
    actionButtonAction('switch-tool', 'Switch tool', 29 /* SwitchTool */),
    actionButtonAction('switch-entity', 'Switch item to place'),
    actionButtonAction('switch-entity-rev', 'Switch item to place (reverse)'),
    actionButtonAction('switch-tile', 'Switch tile to place'),
];
const commandActions = [
    commandButtonAction('/roll', '🎲'),
    commandButtonAction('/gifts', '🎁'),
    commandButtonAction('/candies', '🍬'),
    commandButtonAction('/clovers', '🍀'),
    commandButtonAction('/toys', '🎅'),
    commandButtonAction('/eggs', '🥚'),
];
const additionalActionsActions = [
    expressionButtonAction(undefined),
];
function getActionAction(action) {
    return actionActions.find(a => a.action === action);
}
function getCommandAction(command) {
    return commandActions.find(a => a.command === command);
}
function createButtionActionActions() {
    return [...actionActions, ...additionalActionsActions];
}
exports.createButtionActionActions = createButtionActionActions;
function createButtonCommandActions() {
    return [...commandActions];
}
exports.createButtonCommandActions = createButtonCommandActions;
function createDefaultButtonActions() {
    return DEVELOPMENT ? [
        { action: getActionAction('boop') },
        { action: getActionAction('down') },
        { action: getActionAction('up') },
        { action: getActionAction('turn-head') },
        { action: expressionButtonAction(clientUtils_1.createExpression(6 /* Closed */, 6 /* Closed */, 0 /* Smile */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 3 /* Neutral3 */, 0 /* Smile */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 3 /* Scrunch */, 0 /* Forward */, 1 /* Up */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(19 /* Angry */, 19 /* Angry */, 3 /* Scrunch */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(3 /* Neutral3 */, 3 /* Neutral3 */, 6 /* Flat */, 2 /* Left */, 2 /* Left */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(23 /* X */, 23 /* X */, 6 /* Flat */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(4 /* Neutral4 */, 4 /* Neutral4 */, 6 /* Flat */)) },
        { action: undefined },
        { action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 6 /* Flat */, 6 /* Shocked */, 6 /* Shocked */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 2 /* Left */)) },
        { action: getCommandAction('/roll') },
        { action: itemButtonAction(sprites.flower_2, 14) },
        { action: itemButtonAction(sprites.apple_1, 5) },
        { action: itemButtonAction(sprites.pumpkin_default) },
        { action: itemButtonAction(sprites.tree_1, 2) },
        {
            action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 6 /* Flat */, 6 /* Shocked */, 6 /* Shocked */, 8 /* Tears */))
        },
        {
            action: expressionButtonAction(clientUtils_1.createExpression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 2 /* Left */, 4 /* Cry */))
        },
        {
            action: expressionButtonAction(clientUtils_1.createExpression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 2 /* Left */, 16 /* Hearts */))
        },
        {
            action: expressionButtonAction(clientUtils_1.createExpression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 2 /* Left */, 2 /* Zzz */))
        },
        {
            action: expressionButtonAction(clientUtils_1.createExpression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 2 /* Left */, 2 /* Zzz */ | 4 /* Cry */ | 16 /* Hearts */ | 1 /* Blush */))
        },
    ] : [
        { action: getActionAction('boop') },
        { action: getActionAction('down') },
        { action: getActionAction('up') },
        { action: getActionAction('turn-head') },
        { action: getActionAction('magic') },
        { action: expressionButtonAction(undefined) },
        { action: expressionButtonAction(clientUtils_1.createExpression(6 /* Closed */, 6 /* Closed */, 0 /* Smile */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 3 /* Neutral3 */, 0 /* Smile */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 3 /* Scrunch */, 0 /* Forward */, 1 /* Up */)) },
        { action: expressionButtonAction(clientUtils_1.createExpression(19 /* Angry */, 19 /* Angry */, 3 /* Scrunch */)) },
    ];
}
exports.createDefaultButtonActions = createDefaultButtonActions;
function serializeActions(slots) {
    const serialized = slots.slice(0, constants_1.ACTIONS_LIMIT).map(serializeAction);
    while (serialized.length && !serialized[serialized.length - 1]) {
        serialized.pop();
    }
    return JSON.stringify(serialized);
}
exports.serializeActions = serializeActions;
function deserializeActions(data) {
    try {
        const json = JSON.parse(data);
        return json.slice(0, constants_1.ACTIONS_LIMIT).map(deserializeAction);
    }
    catch (e) {
        DEVELOPMENT && console.error(e);
        return [];
    }
}
exports.deserializeActions = deserializeActions;
function serializeAction({ action }) {
    if (action) {
        switch (action.type) {
            case 'action':
                return { act: action.action };
            case 'command':
                return { cmd: action.command };
            case 'expression':
                return { exp: expressionEncoder_1.encodeExpression(action.expression) };
            case 'entity':
                return { ent: action.entity };
            default:
                DEVELOPMENT && console.warn(`Missing serialization for ${JSON.stringify(action)}`);
                return null;
        }
    }
    else {
        return null;
    }
}
function deserializeAction(data) {
    if (data) {
        if ('act' in data || 'action' in data) {
            return { action: getActionAction(data.act || data.action) };
        }
        else if ('cmd' in data || 'command' in data) {
            return { action: getCommandAction(data.cmd || data.command) };
        }
        else if ('exp' in data || 'expression' in data) {
            const expression = expressionEncoder_1.decodeExpression(data.exp || data.expression | 0);
            return { action: expressionButtonAction(expression) };
        }
        else if ('ent' in data || 'entity' in data) {
            return { action: entityButtonAction(data.ent || data.entity) };
        }
        else {
            DEVELOPMENT && console.warn(`Missing deserialization for ${JSON.stringify(data)}`);
        }
    }
    return { action: undefined };
}
const lastCommandCalls = {};
function useAction(game, action) {
    if (action) {
        switch (action.type) {
            case 'expression':
                game.send(server => server.expression(expressionEncoder_1.encodeExpression(action.expression)));
                break;
            case 'action':
                if (action.sendAction) {
                    game.send(server => server.action(action.sendAction));
                }
                else {
                    switch (action.action) {
                        case 'boop':
                            playerActions_1.boopAction(game);
                            break;
                        case 'up':
                            playerActions_1.upAction(game);
                            break;
                        case 'down':
                            playerActions_1.downAction(game);
                            break;
                        case 'turn-head':
                            playerActions_1.turnHeadAction(game);
                            break;
                        case 'switch-entity':
                            game.send(server => server.action(31 /* SwitchToPlaceTool */));
                            game.changePlaceEntity(false);
                            break;
                        case 'switch-entity-rev':
                            game.send(server => server.action(31 /* SwitchToPlaceTool */));
                            game.changePlaceEntity(true);
                            break;
                        case 'switch-tile':
                            game.send(server => server.action(32 /* SwitchToTileTool */));
                            game.changePlaceTile(false);
                            break;
                        default:
                            console.log('Action not supported: ', action.action);
                    }
                }
                break;
            case 'command':
                const now = performance.now();
                const lastCall = lastCommandCalls[action.command] | 0;
                if ((now - lastCall) > constants_1.COMMAND_ACTION_TIME_DELAY) {
                    lastCommandCalls[action.command] = now;
                    const chatType = interfaces_1.isPartyChat(game.lastChatMessageType) ? 1 /* Party */ : 0 /* Say */;
                    game.send(server => server.say(0, action.command, chatType));
                }
                break;
            case 'entity':
                if (BETA) {
                    game.editor.type = action.entity;
                }
                break;
            default:
                console.log('Action type not supported: ', action.type);
        }
    }
}
exports.useAction = useAction;
function shouldRedrawAction(action, state, game) {
    if (action !== state.action) {
        return true;
    }
    else if (action) {
        switch (action.type) {
            case 'action': {
                switch (action.action) {
                    case 'up':
                        return state.draw !== getUpDrawFunc(game);
                    case 'down':
                        return state.draw !== getDownDrawFunc(game);
                    // case 'turn-head':
                    // 	return state.right !== (game.player && isHeadFacingRight(game.player));
                    default:
                        return false;
                }
            }
            default:
                return false;
        }
    }
    else {
        return false;
    }
}
const canvasCache = new Map();
const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.fontPalette);
const emojiPalette = ponyInfo_1.mockPaletteManager.addArray(sprites.emojiPalette);
function drawCanvasCached(key, action) {
    const canvas = canvasCache.get(key) || contextSpriteBatch_1.drawCanvas(ICON_SIZE, ICON_SIZE, sprites.paletteSpriteSheet, undefined, action);
    canvasCache.set(key, canvas);
    return canvas;
}
function drawAction(canvas, action, state, game) {
    if (canvasUtils_1.resizeCanvasWithRatio(canvas, CANVAS_SIZE, CANVAS_SIZE)) {
        state.action = 0;
    }
    if (!spriteUtils_1.spriteSheetsLoaded || !shouldRedrawAction(action, state, game))
        return;
    const context = canvas.getContext('2d');
    if (!context)
        return;
    state.action = action;
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvasUtils_1.disableImageSmoothing(context);
    const scale = 2 * canvasUtils_1.getPixelRatio();
    const bufferSize = ICON_SIZE;
    if (action) {
        switch (action.type) {
            case 'expression': {
                const buffer = contextSpriteBatch_1.drawCanvas(bufferSize, bufferSize, sprites.paletteSpriteSheet, undefined, batch => {
                    const state = Object.assign({}, createState(), { expression: action.expression });
                    const options = Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), { noEars: true });
                    ponyDraw_1.drawHead(batch, expressionPony, headX, headY, undefined, ponyAnimations_1.defaultHeadFrame, state, options, false, 0);
                    if (action.expression) {
                        const extra = action.expression.extra;
                        if (utils_1.hasFlag(extra, 2 /* Zzz */)) {
                            batch.drawSprite(sprites.emote_sleep1.frames[13], colors_1.WHITE, defaultPalette, headX + 15, headY + 3);
                        }
                        if (utils_1.hasFlag(extra, 16 /* Hearts */)) {
                            batch.drawSprite(sprites.emote_hearts.frames[41], colors_1.HEARTS_COLOR, defaultPalette, headX + 8, headY + 22);
                        }
                        if (utils_1.hasFlag(extra, 4 /* Cry */)) {
                            batch.drawSprite(sprites.emote_cry2.frames[4], colors_1.WHITE, defaultPalette, headX, headY);
                        }
                        else if (utils_1.hasFlag(extra, 8 /* Tears */)) {
                            batch.drawSprite(sprites.emote_tears.frames[0], colors_1.WHITE, defaultPalette, headX, headY);
                        }
                    }
                    else {
                        const color = color_1.parseColor(colors_1.ACTION_EXPRESSION_BG);
                        batch.drawRect(color, 0, 3, 15, 5);
                        batch.drawRect(color, 0, 8, 3, 1);
                        batch.drawRect(color, 8, 8, 4, 1);
                    }
                });
                context.fillStyle = colors_1.ACTION_EXPRESSION_BG;
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.scale(scale, scale);
                context.drawImage(buffer, 0, 0);
                break;
            }
            case 'command': {
                const buffer = drawCanvasCached(`command:${action.icon}`, batch => {
                    const bounds = rect_1.rect(0, 0, 15, 15);
                    const options = { palette, emojiPalette };
                    spriteFont_1.drawTextAligned(batch, action.icon, fonts_1.fontPal, colors_1.BLACK, bounds, 2 /* Center */, 2 /* Middle */, options);
                });
                context.fillStyle = colors_1.ACTION_COMMAND_BG;
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.scale(scale, scale);
                context.drawImage(buffer, -0.5, 0.5);
                break;
            }
            case 'action': {
                let buffer;
                if (action.action === 'up' || action.action === 'down') {
                    state.draw = action.action === 'up' ? getUpDrawFunc(game) : getDownDrawFunc(game);
                    buffer = drawCanvasCached(`action:${action.action}:${state.draw}`, batch => {
                        state.draw && getDrawFuncByName(state.draw)(batch);
                    });
                }
                else {
                    buffer = drawCanvasCached(`action:${action.action}`, batch => {
                        switch (action.action) {
                            case 'boop': {
                                const state = Object.assign({}, createState(), { animation: headlessBoop, animationFrame: 0 });
                                ponyDraw_1.drawPony(batch, actionPony, state, 25, 32, ponyHelpers_1.defaultDrawPonyOptions());
                                break;
                            }
                            case 'turn-head': {
                                // state.right = game.player && isHeadFacingRight(game.player);
                                const ponyState = Object.assign({}, createState(), { animation: ponyAnimations_1.stand });
                                ponyDraw_1.drawPony(batch, actionPony, ponyState, 15, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                // if (!state.right) {
                                // 	context.translate(context.canvas.width, 0);
                                // 	context.scale(-1, 1);
                                // }
                                break;
                            }
                            case 'sneeze': {
                                const state = Object.assign({}, createState(), { headAnimation: ponyAnimations_1.sneeze, headAnimationFrame: 3 });
                                ponyDraw_1.drawPony(batch, actionPony, state, 17, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                break;
                            }
                            case 'sleep': {
                                const state = Object.assign({}, createState(), { expression: clientUtils_1.createExpression(6 /* Closed */, 6 /* Closed */, 2 /* Neutral */) });
                                ponyDraw_1.drawPony(batch, actionPony, state, 18, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                batch.drawSprite(sprites.emote_sleep1.frames[13], colors_1.WHITE, defaultPalette, headX + 15, headY + 3);
                                break;
                            }
                            case 'drop': {
                                const state = Object.assign({}, createState(), { holding: mixins_1.fakePaletteManager(() => entities_1.apple2(0, 0)) });
                                ponyDraw_1.drawPony(batch, actionPony, state, 20, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                batch.drawSprite(sprites.arrow_down, colors_1.BLACK, defaultPalette, 1, 3);
                                break;
                            }
                            case 'drop-toy': {
                                const state = Object.assign({}, createState());
                                const options = Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), { toy: 17 });
                                ponyDraw_1.drawPony(batch, actionPony, state, 18, 52, options);
                                batch.drawSprite(sprites.arrow_down, colors_1.BLACK, defaultPalette, 1, 3);
                                break;
                            }
                            case 'yawn': {
                                const state = Object.assign({}, createState(), { headAnimation: ponyAnimations_1.yawn, headAnimationFrame: 3 });
                                ponyDraw_1.drawPony(batch, actionPony, state, 17, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                break;
                            }
                            case 'laugh': {
                                const state = Object.assign({}, createState(), { headAnimation: ponyAnimations_1.laugh, headAnimationFrame: 3 });
                                ponyDraw_1.drawPony(batch, actionPony, state, 17, 38, ponyHelpers_1.defaultDrawPonyOptions());
                                break;
                            }
                            case 'blush': {
                                const state = Object.assign({}, createState(), { expression: clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */, 0 /* Forward */, 0 /* Forward */, 1 /* Blush */) });
                                ponyDraw_1.drawPony(batch, actionPony, state, 17, 40, ponyHelpers_1.defaultDrawPonyOptions());
                                break;
                            }
                            case 'love': {
                                batch.drawSprite(sprites.emote_hearts.frames[10], 0xbc414fff, defaultPalette, headX + 2, headY + 18);
                                break;
                            }
                            case 'magic': {
                                const state = Object.assign({}, createState(), { headAnimation: ponyAnimations_1.laugh, headAnimationFrame: 3 });
                                ponyDraw_1.drawPony(batch, actionPonyWithHorn, state, 17, 48, ponyHelpers_1.defaultDrawPonyOptions());
                                batch.drawSprite(sprites.magic_icon, colors_1.WHITE, defaultPalette, 4, 2);
                                break;
                            }
                            case 'switch-tool': {
                                const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.tools_icon.palettes[0]);
                                batch.drawSprite(sprites.tools_icon.color, colors_1.WHITE, palette, 0, 2);
                                break;
                            }
                            case 'switch-entity': {
                                const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.hammer.palettes[0]);
                                batch.drawSprite(sprites.hammer.color, colors_1.WHITE, palette, 2, 2);
                                break;
                            }
                            case 'switch-entity-rev': {
                                const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.hammer.palettes[0]);
                                batch.drawSprite(sprites.hammer.color, colors_1.WHITE, palette, 2, 3);
                                batch.drawSprite(sprites.arrow_left, colors_1.BLACK, defaultPalette, 1, 1);
                                break;
                            }
                            case 'switch-tile': {
                                const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.hammer.palettes[0]);
                                batch.drawSprite(sprites.hammer.color, colors_1.WHITE, palette, 2, 2);
                                break;
                            }
                            default:
                                throw new Error(`Invalid action: ${action.action}`);
                        }
                    });
                }
                context.fillStyle = colors_1.ACTION_ACTION_BG;
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.scale(scale, scale);
                context.drawImage(buffer, 0, 0);
                break;
            }
            case 'item': {
                const buffer = contextSpriteBatch_1.drawCanvas(bufferSize, bufferSize, sprites.paletteSpriteSheet, undefined, batch => {
                    const palette = ponyInfo_1.mockPaletteManager.addArray(action.icon.palettes[0]);
                    const sprite = action.icon.color;
                    batch.drawSprite(sprite, colors_1.WHITE, palette, Math.round((15 - sprite.w) / 2), Math.round((15 - sprite.h) / 2) + 1);
                });
                context.fillStyle = colors_1.ACTION_ITEM_BG;
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.scale(scale, scale);
                context.drawImage(buffer, -0.5, -0.5);
                break;
            }
            case 'entity': {
                if (BETA) {
                    const types = model_1.getEntityTypesFromName(action.entity) || [];
                    const size = bufferSize * scale;
                    const entities = types.map(type => entities_1.createAnEntity(type, 0, 0, 0, {}, ponyInfo_1.mockPaletteManager, game));
                    // createAnEntity(type, 0, toWorldX(size / 2 - 2), toWorldY(size * 0.75), {}, mockPaletteManager));
                    const bounds = lodash_1.compact(entities.map(e => e.bounds)).reduce(rect_1.addRects, rect_1.rect(0, 0, 0, 0));
                    const center = rect_1.centerPoint(bounds);
                    const buffer = contextSpriteBatch_1.drawCanvas(size, size, sprites.paletteSpriteSheet, undefined, batch => {
                        for (const entity of entities) {
                            if (entity.draw) {
                                entity.x += positionUtils_1.toWorldX(size / 2 - 2 - center.x);
                                entity.y += positionUtils_1.toWorldY(size / 2 - center.y);
                                entity.draw(batch, Object.assign({}, interfaces_1.defaultDrawOptions, { shadowColor: colors_1.TRANSPARENT }));
                            }
                        }
                    });
                    context.fillStyle = colors_1.ENTITY_ITEM_BG;
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(buffer, 0, 0);
                }
                break;
            }
        }
    }
    context.restore();
}
exports.drawAction = drawAction;
function drawLie(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.lie });
    ponyDraw_1.drawPony(batch, actionPony, state, -6, 15, ponyHelpers_1.defaultDrawPonyOptions());
}
function drawLieDisabled(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.lie });
    batch.drawRect(ACTION_ACTION_BG_DISABLED, 0, 0, 50, 50);
    ponyDraw_1.drawPony(batch, actionPonyDisabled, state, -6, 15, ponyHelpers_1.defaultDrawPonyOptions());
}
function drawSit(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.sit });
    ponyDraw_1.drawPony(batch, actionPony, state, -6, 15, ponyHelpers_1.defaultDrawPonyOptions());
}
function drawStand(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.stand });
    ponyDraw_1.drawPony(batch, actionPony, state, -1, 15, ponyHelpers_1.defaultDrawPonyOptions());
}
function drawFly(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.fly });
    ponyDraw_1.drawPony(batch, actionPonyWithWings, state, 0, 30, ponyHelpers_1.defaultDrawPonyOptions());
}
function drawFlyDisabled(batch) {
    const state = Object.assign({}, createState(), { animation: ponyAnimations_1.fly });
    batch.drawRect(ACTION_ACTION_BG_DISABLED, 0, 0, 50, 50);
    ponyDraw_1.drawPony(batch, actionPonyWithWingsDisabled, state, 0, 30, ponyHelpers_1.defaultDrawPonyOptions());
}
function getDrawFuncByName(name) {
    switch (name) {
        case 'lie': return drawLie;
        case 'sit': return drawSit;
        case 'stand': return drawStand;
        case 'fly': return drawFly;
        case 'flyDisabled': return drawFlyDisabled;
        case 'lieDisabled': return drawLieDisabled;
        default:
            throw new Error(`Invalid name: ${name}`);
    }
}
function getUpDrawFunc(game) {
    const player = game.player;
    if (player) {
        if (entityUtils_1.isPonyLying(player)) {
            return 'sit';
        }
        else if (entityUtils_1.isPonySitting(player)) {
            return 'stand';
        }
        else if (entityUtils_1.isPonyStanding(player) && pony_1.canPonyFly(player)) {
            return 'fly';
        }
    }
    return 'flyDisabled';
}
function getDownDrawFunc(game) {
    const player = game.player;
    if (player) {
        if (entityUtils_1.isPonySitting(player)) {
            return 'lie';
        }
        else if (entityUtils_1.isPonyStanding(player)) {
            return 'sit';
        }
        else if (entityUtils_1.isPonyFlying(player)) {
            return 'stand';
        }
    }
    return 'lieDisabled';
}
//# sourceMappingURL=buttonActions.js.map