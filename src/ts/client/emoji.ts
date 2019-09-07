import { escape } from 'lodash';
import { Sprite } from '../common/interfaces';
import { canvasToSource } from './canvasUtils';
import { drawCanvas } from '../graphics/contextSpriteBatch';
import { WHITE } from '../common/colors';
import { normalSpriteSheet } from '../generated/sprites';
import { includes } from '../common/utils';

export interface Emoji {
	names: string[];
	symbol: string;
}

export const emojis: Emoji[] = [
	// faces
	['🙂', 'face', 'tiny', 'tinyface', 'slight_smile'],
	['😵', 'derp', 'dizzy_face'],
	['😠', 'angry'],
	['😐', 'neutral', 'neutral_face'],
	['😑', 'expressionless'],
	['😆', 'laughing'],
	['😍', 'heart_eyes'],
	['😟', 'worried'],
	['🤔', 'thinking'],
	['🙃', 'upside_down'],
	['😈', 'evil', 'smiling_imp'],
	['👿', 'imp', 'angry_evil'],
	['👃', 'nose', 'c'],

	// cat faces
	['🐱', 'cat'],
	['😺', 'smiley_cat'],
	['😸', 'smile_cat'],
	['😹', 'joy_cat'],
	['😻', 'heart_eyes_cat'],
	['😼', 'smirk_cat'],
	['😽', 'kissing_cat'],
	['🙀', 'scream_cat'],
	['😿', 'cryingcat', 'crying_cat_face'],
	['😾', 'pouting_cat'],

	// hearts
	['❤', 'heart'],
	['💙', 'blue_heart', 'meno'],
	['💚', 'green_heart', 'chira'],
	['💛', 'yellow_heart'],
	['💜', 'purple_heart'],
	['🖤', 'black_heart', 'shino'],
	['💔', 'broken_heart'],
	['💖', 'sparkling_heart'],
	['💗', 'heartpulse'],
	['💕', 'two_hearts'],

	// food / objects
	['🥌', 'rock', 'stone'],
	['🍕', 'pizza'],
	['🍎', 'apple'],
	['🍏', 'gapple', 'green_apple'],
	['🍊', 'orange', 'tangerine'],
	['🍐', 'pear'],
	['🥭', 'mango'],
	['🥕', 'carrot'],
	['🍇', 'grapes'],
	['🍌', 'banana'],
	['⛏', 'pick'],
	['🥚', 'egg'],
	['💮', 'flower', 'white_flower'],
	['🌸', 'cherry_blossom'],
	['🍬', 'candy'],
	['🍡', 'candy_cane'],
	['🍭', 'lollipop'],
	['⭐', 'star'],
	['🌟', 'star2'],
	['🌠', 'shooting_star'],
	['⚡', 'zap'],
	['❄', 'snow', 'snowflake'],
	['⛄', 'snowpony', 'snowman'],
	['🏀', 'pumpkin'],
	['🎃', 'jacko', 'jack_o_lantern'],
	['🌲', 'evergreen_tree', 'pinetree'],
	['🎄', 'christmas_tree'],
	['🕯', 'candle'],
	['🎅', 'santa_hat', 'santa_claus'],
	['💐', 'holly'],
	['🌿', 'mistletoe'],
	['🎲', 'die', 'dice', 'game_die'],
	['✨', 'sparkles'],
	['🎁', 'gift', 'present'],
	['🔥', 'fire'],
	['🎵', 'musical_note'],
	['🎶', 'notes'],
	['🌈', 'rainbow'],
	['🐾', 'feet', 'paw', 'paws'],
	['👑', 'crown'],
	['💎', 'gem'],
	['☘', 'shamrock', 'clover'],
	['🍀', 'four_leaf_clover'],
	['🍪', 'cookie'],

	// animals
	['🦋', 'butterfly'],
	['🦇', 'bat'],
	['🕷', 'spider'],
	['👻', 'ghost'],
	['🐈', 'cat2'],

	// other
	['™', 'tm'],
	['♂', 'male'],
	['♀', 'female'],
	['⚧', 'trans', 'transgender'],
].map(createEmoji);

export const emojiMap = new Map<string, string>();
export const emojiNames = emojis.slice().sort().map(e => `:${e.names[0]}:`);
emojis.forEach(e => e.names.forEach(name => emojiMap.set(`:${name}:`, e.symbol)));

export function findEmoji(name: string): Emoji | undefined {
	return emojis.find(e => name === e.symbol || includes(e.names, name));
}

export function replaceEmojis(text: string | undefined): string {
	return (text || '').replace(/:[a-z0-9_]+:/ig, match => emojiMap.get(match) || match);
}

function createEmoji([symbol, ...names]: string[]): Emoji {
	return { symbol, names: [...names, ...names.filter(n => /_/.test(n)).map(n => n.replace(/_/g, ''))] };
}

const emojiImages = new Map<Sprite, string>();
const emojiImagePromises = new Map<Sprite, Promise<string>>();

export function getEmojiImageAsync(sprite: Sprite, callback: (str: string) => void) {
	const src = emojiImages.get(sprite);

	if (src) {
		callback(src);
		return;
	}

	const promise = emojiImagePromises.get(sprite);

	if (promise) {
		promise.then(callback);
		return;
	}

	const width = sprite.w + sprite.ox;
	// const height = sprite.h + sprite.oy;
	const canvas = drawCanvas(width, 10, normalSpriteSheet, undefined, batch => batch.drawSprite(sprite, WHITE, 0, 0));
	const newPromise = canvasToSource(canvas);
	emojiImagePromises.set(sprite, newPromise);

	newPromise
		.then(src => {
			emojiImages.set(sprite, src);
			emojiImagePromises.delete(sprite);
			return src;
		})
		.then(callback);
}

const emojisRegex = new RegExp(`(${[
	...emojis.map(e => e.symbol),
	'♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎',
].join('|')})`, 'g');

export function splitEmojis(text: string) {
	return text.split(emojisRegex);
}

export function hasEmojis(text: string) {
	return emojisRegex.test(text);
}

export function nameToHTML(name: string) {
	return escape(name);
}

export interface AutocompleteState {
	lastEmoji?: string;
}

const names = emojiNames.slice().sort();

export function autocompleteMesssage(message: string, shift: boolean, state: AutocompleteState): string {
	return message.replace(/:[a-z0-9_]+:?$/, match => {
		state.lastEmoji = state.lastEmoji || match;
		const matches = names.filter(e => e.indexOf(state.lastEmoji!) === 0);
		const index = matches.indexOf(match);
		const offset = index === -1 ? 0 : (index + matches.length + (shift ? -1 : 1)) % matches.length;
		return matches[offset] || match;
	});
}
