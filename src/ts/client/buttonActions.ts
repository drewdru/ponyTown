import { compact } from 'lodash';
import {
	Expression, ExpressionButtonAction, CommandButtonAction, ActionButtonAction, ItemButtonAction,
	ColorShadow, Eye, Muzzle, Iris, ButtonActionSlot, ExpressionExtra, ButtonAction, ChatType, BodyAnimation,
	Action, isPartyChat, EntityButtonAction, defaultDrawOptions
} from '../common/interfaces';
import * as sprites from '../generated/sprites';
import { createExpression } from './clientUtils';
import { encodeExpression, decodeExpression } from '../common/encoders/expressionEncoder';
import { PonyTownGame } from './game';
import { boopAction, upAction, downAction, turnHeadAction } from './playerActions';
import { ACTIONS_LIMIT, COMMAND_ACTION_TIME_DELAY } from '../common/constants';
import { cloneDeep, hasFlag } from '../common/utils';
import { boop, defaultHeadFrame, stand, sneeze, yawn, lie, sit, fly, laugh } from './ponyAnimations';
import { createDefaultPony, syncLockedPonyInfo, toPalette, mockPaletteManager } from '../common/ponyInfo';
import {
	ACTION_EXPRESSION_EYE_COLOR, ACTION_EXPRESSION_BG, ACTION_ACTION_COAT_COLOR, WHITE, HEARTS_COLOR,
	ACTION_COMMAND_BG, BLACK, ACTION_ACTION_BG, ACTION_ITEM_BG, blushColor, ENTITY_ITEM_BG, TRANSPARENT
} from '../common/colors';
import { resizeCanvasWithRatio, getPixelRatio, disableImageSmoothing } from './canvasUtils';
import { drawCanvas, ContextSpriteBatch } from '../graphics/contextSpriteBatch';
import { defaultPonyState, defaultDrawPonyOptions } from './ponyHelpers';
import { drawHead, drawPony } from './ponyDraw';
import { parseColor, toGrayscale, colorToHexRGB } from '../common/color';
import { rect, addRects, centerPoint } from '../common/rect';
import { drawTextAligned, HAlign, VAlign } from '../graphics/spriteFont';
import { fontPal } from '../client/fonts';
import { isPonyLying, isPonySitting, isPonyStanding, isPonyFlying } from '../common/entityUtils';
import { canPonyFly } from '../common/pony';
import { apple2, createAnEntity } from '../common/entities';
import { fakePaletteManager } from '../common/mixins';
import { spriteSheetsLoaded } from './spriteUtils';
import { getEntityTypesFromName } from '../components/services/model';
import { toWorldY, toWorldX } from '../common/positionUtils';

const CANVAS_SIZE = 29;
const ICON_SIZE = 16;

const headX = -26;
const headY = -30;
const headlessBoopFrame = { ...cloneDeep(boop.frames[7]), head: 0 };
const headlessBoop: BodyAnimation = { name: '', loop: false, fps: 1, frames: [headlessBoopFrame] };

function createPony(coatColor: string, wings = false, horn = false) {
	const info = createDefaultPony();
	info.coatFill = coatColor;
	info.mane!.type = 0;
	info.backMane!.type = 0;
	info.tail!.type = 0;
	info.eyeColorRight = ACTION_EXPRESSION_EYE_COLOR;

	if (wings) {
		info.wings!.type = 1;
	}

	if (horn) {
		info.horn!.type = 1;
	}

	syncLockedPonyInfo(info);
	return toPalette(info, mockPaletteManager);
}

function createState() {
	const state = defaultPonyState();
	state.blushColor = blushColor(parseColor(ACTION_ACTION_COAT_COLOR));
	return state;
}

function colorToGrayscale(value: string) {
	return colorToHexRGB(toGrayscale(parseColor(value)));
}

const ACTION_ACTION_BG_DISABLED = toGrayscale(parseColor(ACTION_ACTION_BG));
const expressionPony = createPony(ACTION_EXPRESSION_BG);
const actionPony = createPony(ACTION_ACTION_COAT_COLOR);
const actionPonyWithHorn = createPony(ACTION_ACTION_COAT_COLOR, false, true);
const actionPonyWithWings = createPony(ACTION_ACTION_COAT_COLOR, true);
const actionPonyDisabled = createPony(colorToGrayscale(ACTION_ACTION_COAT_COLOR));
const actionPonyWithWingsDisabled = createPony(colorToGrayscale(ACTION_ACTION_COAT_COLOR), true);
const defaultPalette = mockPaletteManager.addArray(sprites.defaultPalette);
export const actionExpressionDefaultPalette = mockPaletteManager.add(Array.from(sprites.defaultPalette));
expressionPony.defaultPalette = actionExpressionDefaultPalette;
expressionPony.defaultPalette.colors[4] = 0xe16200ff; // tongue color

export function expressionButtonAction(expression: Expression | undefined): ExpressionButtonAction {
	return { type: 'expression', expression, title: expression ? '' : 'Reset expression' };
}

export function commandButtonAction(command: string, icon: string): CommandButtonAction {
	return { type: 'command', command, title: command, icon };
}

export function actionButtonAction(action: string, title: string, sendAction = Action.None): ActionButtonAction {
	return { type: 'action', action, title, sendAction };
}

export function itemButtonAction(icon: ColorShadow, count?: number): ItemButtonAction {
	return { type: 'item', icon, count };
}

export function entityButtonAction(entity: string): EntityButtonAction {
	return { type: 'entity', entity, title: entity };
}

const actionActions = [
	actionButtonAction('boop', 'Boop'),
	actionButtonAction('down', 'Sit down / Land'),
	actionButtonAction('up', 'Stand up / Fly up'),
	actionButtonAction('turn-head', 'Turn head'),
	actionButtonAction('sneeze', 'Sneeze', Action.Sneeze),
	actionButtonAction('sleep', 'Sleep', Action.Sleep),
	actionButtonAction('yawn', 'Yawn', Action.Yawn),
	actionButtonAction('love', 'Love', Action.Love),
	actionButtonAction('laugh', 'Laugh', Action.Laugh),
	actionButtonAction('blush', 'Blush', Action.Blush),
	actionButtonAction('drop', 'Drop item', Action.Drop),
	actionButtonAction('drop-toy', 'Drop toy', Action.DropToy),
	actionButtonAction('magic', 'Magic', Action.Magic),
	actionButtonAction('switch-tool', 'Switch tool', Action.SwitchTool),
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

function getActionAction(action: string) {
	return actionActions.find(a => a.action === action);
}

function getCommandAction(command: string) {
	return commandActions.find(a => a.command === command);
}

export function createButtionActionActions() {
	return [...actionActions, ...additionalActionsActions];
}

export function createButtonCommandActions() {
	return [...commandActions];
}

export function createDefaultButtonActions(): ButtonActionSlot[] {
	return DEVELOPMENT ? [
		{ action: getActionAction('boop') },
		{ action: getActionAction('down') },
		{ action: getActionAction('up') },
		{ action: getActionAction('turn-head') },
		{ action: expressionButtonAction(createExpression(Eye.Closed, Eye.Closed, Muzzle.Smile)) },
		{ action: expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral3, Muzzle.Smile)) },
		{ action: expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Scrunch, Iris.Forward, Iris.Up)) },
		{ action: expressionButtonAction(createExpression(Eye.Angry, Eye.Angry, Muzzle.Scrunch)) },
		{ action: expressionButtonAction(createExpression(Eye.Neutral3, Eye.Neutral3, Muzzle.Flat, Iris.Left, Iris.Left)) },
		{ action: expressionButtonAction(createExpression(Eye.X, Eye.X, Muzzle.Flat)) },
		{ action: expressionButtonAction(createExpression(Eye.Neutral4, Eye.Neutral4, Muzzle.Flat)) },
		{ action: undefined },
		{ action: expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Flat, Iris.Shocked, Iris.Shocked)) },
		{ action: expressionButtonAction(createExpression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Left)) },
		{ action: getCommandAction('/roll') },
		{ action: itemButtonAction(sprites.flower_2, 14) },
		{ action: itemButtonAction(sprites.apple_1, 5) },
		{ action: itemButtonAction(sprites.pumpkin_default) },
		{ action: itemButtonAction(sprites.tree_1, 2) },
		{
			action: expressionButtonAction(
				createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Flat, Iris.Shocked, Iris.Shocked, ExpressionExtra.Tears))
		},
		{
			action: expressionButtonAction(
				createExpression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Left, ExpressionExtra.Cry))
		},
		{
			action: expressionButtonAction(
				createExpression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Left, ExpressionExtra.Hearts))
		},
		{
			action: expressionButtonAction(
				createExpression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Left, ExpressionExtra.Zzz))
		},
		{
			action: expressionButtonAction(
				createExpression(
					Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Left,
					ExpressionExtra.Zzz | ExpressionExtra.Cry | ExpressionExtra.Hearts | ExpressionExtra.Blush))
		},
	] : [
			{ action: getActionAction('boop') },
			{ action: getActionAction('down') },
			{ action: getActionAction('up') },
			{ action: getActionAction('turn-head') },
			{ action: getActionAction('magic') },
			{ action: expressionButtonAction(undefined) },
			{ action: expressionButtonAction(createExpression(Eye.Closed, Eye.Closed, Muzzle.Smile)) },
			{ action: expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral3, Muzzle.Smile)) },
			{ action: expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Scrunch, Iris.Forward, Iris.Up)) },
			{ action: expressionButtonAction(createExpression(Eye.Angry, Eye.Angry, Muzzle.Scrunch)) },
		];
}

export function serializeActions(slots: ButtonActionSlot[]): string {
	const serialized = slots.slice(0, ACTIONS_LIMIT).map(serializeAction);

	while (serialized.length && !serialized[serialized.length - 1]) {
		serialized.pop();
	}

	return JSON.stringify(serialized);
}

export function deserializeActions(data: string): ButtonActionSlot[] {
	try {
		const json = JSON.parse(data);
		return json.slice(0, ACTIONS_LIMIT).map(deserializeAction);
	} catch (e) {
		DEVELOPMENT && console.error(e);
		return [];
	}
}

function serializeAction({ action }: ButtonActionSlot): any {
	if (action) {
		switch (action.type) {
			case 'action':
				return { act: action.action };
			case 'command':
				return { cmd: action.command };
			case 'expression':
				return { exp: encodeExpression(action.expression) };
			case 'entity':
				return { ent: action.entity };
			default:
				DEVELOPMENT && console.warn(`Missing serialization for ${JSON.stringify(action)}`);
				return null;
		}
	} else {
		return null;
	}
}

function deserializeAction(data: any): ButtonActionSlot {
	if (data) {
		if ('act' in data || 'action' in data) {
			return { action: getActionAction(data.act || data.action) };
		} else if ('cmd' in data || 'command' in data) {
			return { action: getCommandAction(data.cmd || data.command) };
		} else if ('exp' in data || 'expression' in data) {
			const expression = decodeExpression(data.exp || data.expression | 0);
			return { action: expressionButtonAction(expression) };
		} else if ('ent' in data || 'entity' in data) {
			return { action: entityButtonAction(data.ent || data.entity) };
		} else {
			DEVELOPMENT && console.warn(`Missing deserialization for ${JSON.stringify(data)}`);
		}
	}

	return { action: undefined };
}

const lastCommandCalls: { [key: string]: number; } = {};

export function useAction(game: PonyTownGame, action: ButtonAction | undefined) {
	if (action) {
		switch (action.type) {
			case 'expression':
				game.send(server => server.expression(encodeExpression(action.expression)));
				break;
			case 'action':
				if (action.sendAction) {
					game.send(server => server.action(action.sendAction));
				} else {
					switch (action.action) {
						case 'boop':
							boopAction(game);
							break;
						case 'up':
							upAction(game);
							break;
						case 'down':
							downAction(game);
							break;
						case 'turn-head':
							turnHeadAction(game);
							break;
						case 'switch-entity':
							game.send(server => server.action(Action.SwitchToPlaceTool));
							game.changePlaceEntity(false);
							break;
						case 'switch-entity-rev':
							game.send(server => server.action(Action.SwitchToPlaceTool));
							game.changePlaceEntity(true);
							break;
						case 'switch-tile':
							game.send(server => server.action(Action.SwitchToTileTool));
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

				if ((now - lastCall) > COMMAND_ACTION_TIME_DELAY) {
					lastCommandCalls[action.command] = now;
					const chatType = isPartyChat(game.lastChatMessageType) ? ChatType.Party : ChatType.Say;
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

function shouldRedrawAction(action: ButtonAction | undefined, state: any, game: PonyTownGame) {
	if (action !== state.action) {
		return true;
	} else if (action) {
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
	} else {
		return false;
	}
}

const canvasCache = new Map<string, HTMLCanvasElement>();
const palette = mockPaletteManager.addArray(sprites.fontPalette);
const emojiPalette = mockPaletteManager.addArray(sprites.emojiPalette);

function drawCanvasCached(key: string, action: (batch: ContextSpriteBatch) => void) {
	const canvas = canvasCache.get(key) || drawCanvas(ICON_SIZE, ICON_SIZE, sprites.paletteSpriteSheet, undefined, action);
	canvasCache.set(key, canvas);
	return canvas;
}

export function drawAction(canvas: HTMLCanvasElement, action: ButtonAction | undefined, state: any, game: PonyTownGame) {
	if (resizeCanvasWithRatio(canvas, CANVAS_SIZE, CANVAS_SIZE)) {
		state.action = 0;
	}

	if (!spriteSheetsLoaded || !shouldRedrawAction(action, state, game))
		return;

	const context = canvas.getContext('2d');

	if (!context)
		return;

	state.action = action;

	context.save();
	context.clearRect(0, 0, canvas.width, canvas.height);
	disableImageSmoothing(context);

	const scale = 2 * getPixelRatio();
	const bufferSize = ICON_SIZE;

	if (action) {
		switch (action.type) {
			case 'expression': {
				const buffer = drawCanvas(bufferSize, bufferSize, sprites.paletteSpriteSheet, undefined, batch => {
					const state = { ...createState(), expression: action.expression };
					const options = { ...defaultDrawPonyOptions(), noEars: true };
					drawHead(batch, expressionPony, headX, headY, undefined, defaultHeadFrame, state, options, false, 0);

					if (action.expression) {
						const extra = action.expression.extra;

						if (hasFlag(extra, ExpressionExtra.Zzz)) {
							batch.drawSprite(sprites.emote_sleep1.frames[13], WHITE, defaultPalette, headX + 15, headY + 3);
						}

						if (hasFlag(extra, ExpressionExtra.Hearts)) {
							batch.drawSprite(sprites.emote_hearts.frames[41], HEARTS_COLOR, defaultPalette, headX + 8, headY + 22);
						}

						if (hasFlag(extra, ExpressionExtra.Cry)) {
							batch.drawSprite(sprites.emote_cry2.frames[4], WHITE, defaultPalette, headX, headY);
						} else if (hasFlag(extra, ExpressionExtra.Tears)) {
							batch.drawSprite(sprites.emote_tears.frames[0], WHITE, defaultPalette, headX, headY);
						}
					} else {
						const color = parseColor(ACTION_EXPRESSION_BG);
						batch.drawRect(color, 0, 3, 15, 5);
						batch.drawRect(color, 0, 8, 3, 1);
						batch.drawRect(color, 8, 8, 4, 1);
					}
				});

				context.fillStyle = ACTION_EXPRESSION_BG;
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.scale(scale, scale);
				context.drawImage(buffer, 0, 0);
				break;
			}
			case 'command': {
				const buffer = drawCanvasCached(`command:${action.icon}`, batch => {
					const bounds = rect(0, 0, 15, 15);
					const options = { palette, emojiPalette };
					drawTextAligned(batch, action.icon, fontPal, BLACK, bounds, HAlign.Center, VAlign.Middle, options);
				});

				context.fillStyle = ACTION_COMMAND_BG;
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.scale(scale, scale);
				context.drawImage(buffer, -0.5, 0.5);
				break;
			}
			case 'action': {
				let buffer: HTMLCanvasElement;

				if (action.action === 'up' || action.action === 'down') {
					state.draw = action.action === 'up' ? getUpDrawFunc(game) : getDownDrawFunc(game);

					buffer = drawCanvasCached(`action:${action.action}:${state.draw}`, batch => {
						state.draw && getDrawFuncByName(state.draw)(batch);
					});
				} else {
					buffer = drawCanvasCached(`action:${action.action}`, batch => {
						switch (action.action) {
							case 'boop': {
								const state = { ...createState(), animation: headlessBoop, animationFrame: 0 };
								drawPony(batch, actionPony, state, 25, 32, defaultDrawPonyOptions());
								break;
							}
							case 'turn-head': {
								// state.right = game.player && isHeadFacingRight(game.player);
								const ponyState = { ...createState(), animation: stand };
								drawPony(batch, actionPony, ponyState, 15, 40, defaultDrawPonyOptions());

								// if (!state.right) {
								// 	context.translate(context.canvas.width, 0);
								// 	context.scale(-1, 1);
								// }
								break;
							}
							case 'sneeze': {
								const state = { ...createState(), headAnimation: sneeze, headAnimationFrame: 3 };
								drawPony(batch, actionPony, state, 17, 40, defaultDrawPonyOptions());
								break;
							}
							case 'sleep': {
								const state = { ...createState(), expression: createExpression(Eye.Closed, Eye.Closed, Muzzle.Neutral) };
								drawPony(batch, actionPony, state, 18, 40, defaultDrawPonyOptions());
								batch.drawSprite(sprites.emote_sleep1.frames[13], WHITE, defaultPalette, headX + 15, headY + 3);
								break;
							}
							case 'drop': {
								const state = { ...createState(), holding: fakePaletteManager(() => apple2(0, 0)) };
								drawPony(batch, actionPony, state, 20, 40, defaultDrawPonyOptions());
								batch.drawSprite(sprites.arrow_down, BLACK, defaultPalette, 1, 3);
								break;
							}
							case 'drop-toy': {
								const state = { ...createState() };
								const options = { ...defaultDrawPonyOptions(), toy: 17 };
								drawPony(batch, actionPony, state, 18, 52, options);
								batch.drawSprite(sprites.arrow_down, BLACK, defaultPalette, 1, 3);
								break;
							}
							case 'yawn': {
								const state = { ...createState(), headAnimation: yawn, headAnimationFrame: 3 };
								drawPony(batch, actionPony, state, 17, 40, defaultDrawPonyOptions());
								break;
							}
							case 'laugh': {
								const state = { ...createState(), headAnimation: laugh, headAnimationFrame: 3 };
								drawPony(batch, actionPony, state, 17, 38, defaultDrawPonyOptions());
								break;
							}
							case 'blush': {
								const state = {
									...createState(), expression: createExpression(
										Eye.Neutral, Eye.Neutral, Muzzle.Smile, Iris.Forward, Iris.Forward, ExpressionExtra.Blush)
								};
								drawPony(batch, actionPony, state, 17, 40, defaultDrawPonyOptions());
								break;
							}
							case 'love': {
								batch.drawSprite(sprites.emote_hearts.frames[10], 0xbc414fff, defaultPalette, headX + 2, headY + 18);
								break;
							}
							case 'magic': {
								const state = { ...createState(), headAnimation: laugh, headAnimationFrame: 3 };
								drawPony(batch, actionPonyWithHorn, state, 17, 48, defaultDrawPonyOptions());
								batch.drawSprite(sprites.magic_icon, WHITE, defaultPalette, 4, 2);
								break;
							}
							case 'switch-tool': {
								const palette = mockPaletteManager.addArray(sprites.tools_icon.palettes![0]);
								batch.drawSprite(sprites.tools_icon.color, WHITE, palette, 0, 2);
								break;
							}
							case 'switch-entity': {
								const palette = mockPaletteManager.addArray(sprites.hammer.palettes![0]);
								batch.drawSprite(sprites.hammer.color, WHITE, palette, 2, 2);
								break;
							}
							case 'switch-entity-rev': {
								const palette = mockPaletteManager.addArray(sprites.hammer.palettes![0]);
								batch.drawSprite(sprites.hammer.color, WHITE, palette, 2, 3);
								batch.drawSprite(sprites.arrow_left, BLACK, defaultPalette, 1, 1);
								break;
							}
							case 'switch-tile': {
								const palette = mockPaletteManager.addArray(sprites.hammer.palettes![0]);
								batch.drawSprite(sprites.hammer.color, WHITE, palette, 2, 2);
								break;
							}
							default:
								throw new Error(`Invalid action: ${action.action}`);
						}
					});
				}

				context.fillStyle = ACTION_ACTION_BG;
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.scale(scale, scale);
				context.drawImage(buffer, 0, 0);
				break;
			}
			case 'item': {
				const buffer = drawCanvas(bufferSize, bufferSize, sprites.paletteSpriteSheet, undefined, batch => {
					const palette = mockPaletteManager.addArray(action.icon.palettes![0]);
					const sprite = action.icon.color;
					batch.drawSprite(sprite, WHITE, palette,
						Math.round((15 - sprite.w) / 2), Math.round((15 - sprite.h) / 2) + 1);
				});

				context.fillStyle = ACTION_ITEM_BG;
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.scale(scale, scale);
				context.drawImage(buffer, -0.5, -0.5);
				break;
			}
			case 'entity': {
				if (BETA) {
					const types = getEntityTypesFromName(action.entity) || [];
					const size = bufferSize * scale;
					const entities = types.map(type => createAnEntity(type, 0, 0, 0, {}, mockPaletteManager, game));
					// createAnEntity(type, 0, toWorldX(size / 2 - 2), toWorldY(size * 0.75), {}, mockPaletteManager));

					const bounds = compact(entities.map(e => e.bounds)).reduce(addRects, rect(0, 0, 0, 0));
					const center = centerPoint(bounds);

					const buffer = drawCanvas(size, size, sprites.paletteSpriteSheet, undefined, batch => {
						for (const entity of entities) {
							if (entity.draw) {
								entity.x += toWorldX(size / 2 - 2 - center.x);
								entity.y += toWorldY(size / 2 - center.y);
								entity.draw(batch, { ...defaultDrawOptions, shadowColor: TRANSPARENT });
							}
						}
					});

					context.fillStyle = ENTITY_ITEM_BG;
					context.fillRect(0, 0, canvas.width, canvas.height);
					context.drawImage(buffer, 0, 0);
				}
				break;
			}
		}
	}

	context.restore();
}

function drawLie(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: lie };
	drawPony(batch, actionPony, state, -6, 15, defaultDrawPonyOptions());
}

function drawLieDisabled(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: lie };
	batch.drawRect(ACTION_ACTION_BG_DISABLED, 0, 0, 50, 50);
	drawPony(batch, actionPonyDisabled, state, -6, 15, defaultDrawPonyOptions());
}

function drawSit(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: sit };
	drawPony(batch, actionPony, state, -6, 15, defaultDrawPonyOptions());
}

function drawStand(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: stand };
	drawPony(batch, actionPony, state, -1, 15, defaultDrawPonyOptions());
}

function drawFly(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: fly };
	drawPony(batch, actionPonyWithWings, state, 0, 30, defaultDrawPonyOptions());
}

function drawFlyDisabled(batch: ContextSpriteBatch) {
	const state = { ...createState(), animation: fly };
	batch.drawRect(ACTION_ACTION_BG_DISABLED, 0, 0, 50, 50);
	drawPony(batch, actionPonyWithWingsDisabled, state, 0, 30, defaultDrawPonyOptions());
}

function getDrawFuncByName(name: string) {
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

function getUpDrawFunc(game: PonyTownGame) {
	const player = game.player;

	if (player) {
		if (isPonyLying(player)) {
			return 'sit';
		} else if (isPonySitting(player)) {
			return 'stand';
		} else if (isPonyStanding(player) && canPonyFly(player)) {
			return 'fly';
		}
	}

	return 'flyDisabled';
}

function getDownDrawFunc(game: PonyTownGame) {
	const player = game.player;

	if (player) {
		if (isPonySitting(player)) {
			return 'lie';
		} else if (isPonyStanding(player)) {
			return 'sit';
		} else if (isPonyFlying(player)) {
			return 'stand';
		}
	}

	return 'lieDisabled';
}
