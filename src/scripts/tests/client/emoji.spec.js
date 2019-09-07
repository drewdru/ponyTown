"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const emoji_1 = require("../../client/emoji");
describe('emotes', () => {
    describe('findEmote()', () => {
        let appleEmoji;
        before(() => {
            appleEmoji = emoji_1.emojis.find(e => e.symbol === '🍎');
            chai_1.expect(appleEmoji).not.undefined;
        });
        it('returns found emoji by symbol', () => {
            chai_1.expect(emoji_1.findEmoji('🍎')).equal(appleEmoji);
        });
        it('returns found emoji by name', () => {
            chai_1.expect(emoji_1.findEmoji('apple')).equal(appleEmoji);
        });
        it('returns undefined if emoji does not exists', () => {
            chai_1.expect(emoji_1.findEmoji('foobar')).undefined;
        });
    });
    describe('replaceEmotes()', () => {
        it('replaces emoji names with emojis', () => {
            chai_1.expect(emoji_1.replaceEmojis(':apple:')).equal('🍎');
        });
        it('works with additional text around emoji', () => {
            chai_1.expect(emoji_1.replaceEmojis('text :apple: hi')).equal('text 🍎 hi');
        });
        it('works with multiple emojis', () => {
            chai_1.expect(emoji_1.replaceEmojis(':orange: text :apple: hi')).equal('🍊 text 🍎 hi');
        });
        it('does nothing if does not contain any emoji names', () => {
            chai_1.expect(emoji_1.replaceEmojis('plain text')).equal('plain text');
        });
        it('does nothing if emojis are already converted', () => {
            chai_1.expect(emoji_1.replaceEmojis('text 🍎 hi')).equal('text 🍎 hi');
        });
        it('does nothing if emoji name is not found', () => {
            chai_1.expect(emoji_1.replaceEmojis('text :foo: hi')).equal('text :foo: hi');
        });
        it('returns empty string for undefined', () => {
            chai_1.expect(emoji_1.replaceEmojis(undefined)).equal('');
        });
    });
    describe('splitEmotes()', () => {
        it('returns array for plain text', () => {
            chai_1.expect(emoji_1.splitEmojis('foo bar')).eql(['foo bar']);
        });
        it('returns array for plain text', () => {
            chai_1.expect(emoji_1.splitEmojis('foo 🍎 bar')).eql(['foo ', '🍎', ' bar']);
        });
    });
    describe('hasEmotes()', () => {
        it('returns true if contains emotes', () => {
            chai_1.expect(emoji_1.hasEmojis('foo 🍎 bar')).true;
        });
        it('returns false if does not contain emotes', () => {
            chai_1.expect(emoji_1.hasEmojis('foo bar')).false;
        });
    });
    describe('autocompleteMesssage()', () => {
        it('does nothing for empty text', () => {
            chai_1.expect(emoji_1.autocompleteMesssage('', false, {})).equal('');
        });
        it('does nothing for regular text', () => {
            const state = {};
            chai_1.expect(emoji_1.autocompleteMesssage('hello world', false, state)).equal('hello world');
            chai_1.expect(state).eql({});
        });
        it('autocompletes an emote', () => {
            const state = {};
            chai_1.expect(emoji_1.autocompleteMesssage('hello :app', false, state)).equal('hello :apple:');
            chai_1.expect(state).eql({ lastEmoji: ':app' });
        });
        it('autocompletes considering previous autocomplete', () => {
            const state = {};
            chai_1.expect(emoji_1.autocompleteMesssage('hello :a', false, state)).equal('hello :angry:');
            chai_1.expect(emoji_1.autocompleteMesssage('hello :angry:', false, state)).equal('hello :apple:');
            chai_1.expect(state).eql({ lastEmoji: ':a' });
        });
        it('autocompletes with reversed order', () => {
            const state = {};
            chai_1.expect(emoji_1.autocompleteMesssage('hello :b', false, state)).equal('hello :banana:');
            chai_1.expect(emoji_1.autocompleteMesssage('hello :bat:', false, state)).equal('hello :black_heart:');
            chai_1.expect(emoji_1.autocompleteMesssage('hello :black_heart:', true, state)).equal('hello :bat:');
            chai_1.expect(state).eql({ lastEmoji: ':b' });
        });
        it('does nothing if does not match any emoji', () => {
            const state = { lastEmoji: 'xyz' };
            chai_1.expect(emoji_1.autocompleteMesssage('hello :abc', false, state)).equal('hello :abc');
        });
    });
});
//# sourceMappingURL=emoji.spec.js.map