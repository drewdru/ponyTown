import '../lib';
import { expect } from 'chai';
import { splitEmojis, findEmoji, replaceEmojis, emojis, hasEmojis, autocompleteMesssage } from '../../client/emoji';

describe('emotes', () => {
	describe('findEmote()', () => {
		let appleEmoji: any;

		before(() => {
			appleEmoji = emojis.find(e => e.symbol === '🍎');
			expect(appleEmoji).not.undefined;
		});

		it('returns found emoji by symbol', () => {
			expect(findEmoji('🍎')).equal(appleEmoji);
		});

		it('returns found emoji by name', () => {
			expect(findEmoji('apple')).equal(appleEmoji);
		});

		it('returns undefined if emoji does not exists', () => {
			expect(findEmoji('foobar')).undefined;
		});
	});

	describe('replaceEmotes()', () => {
		it('replaces emoji names with emojis', () => {
			expect(replaceEmojis(':apple:')).equal('🍎');
		});

		it('works with additional text around emoji', () => {
			expect(replaceEmojis('text :apple: hi')).equal('text 🍎 hi');
		});

		it('works with multiple emojis', () => {
			expect(replaceEmojis(':orange: text :apple: hi')).equal('🍊 text 🍎 hi');
		});

		it('does nothing if does not contain any emoji names', () => {
			expect(replaceEmojis('plain text')).equal('plain text');
		});

		it('does nothing if emojis are already converted', () => {
			expect(replaceEmojis('text 🍎 hi')).equal('text 🍎 hi');
		});

		it('does nothing if emoji name is not found', () => {
			expect(replaceEmojis('text :foo: hi')).equal('text :foo: hi');
		});

		it('returns empty string for undefined', () => {
			expect(replaceEmojis(undefined)).equal('');
		});
	});

	describe('splitEmotes()', () => {
		it('returns array for plain text', () => {
			expect(splitEmojis('foo bar')).eql(['foo bar']);
		});

		it('returns array for plain text', () => {
			expect(splitEmojis('foo 🍎 bar')).eql(['foo ', '🍎', ' bar']);
		});
	});

	describe('hasEmotes()', () => {
		it('returns true if contains emotes', () => {
			expect(hasEmojis('foo 🍎 bar')).true;
		});

		it('returns false if does not contain emotes', () => {
			expect(hasEmojis('foo bar')).false;
		});
	});

	describe('autocompleteMesssage()', () => {
		it('does nothing for empty text', () => {
			expect(autocompleteMesssage('', false, {})).equal('');
		});

		it('does nothing for regular text', () => {
			const state = {};
			expect(autocompleteMesssage('hello world', false, state)).equal('hello world');
			expect(state).eql({});
		});

		it('autocompletes an emote', () => {
			const state = {};
			expect(autocompleteMesssage('hello :app', false, state)).equal('hello :apple:');
			expect(state).eql({ lastEmoji: ':app' });
		});

		it('autocompletes considering previous autocomplete', () => {
			const state = {};
			expect(autocompleteMesssage('hello :a', false, state)).equal('hello :angry:');
			expect(autocompleteMesssage('hello :angry:', false, state)).equal('hello :apple:');
			expect(state).eql({ lastEmoji: ':a' });
		});

		it('autocompletes with reversed order', () => {
			const state = {};
			expect(autocompleteMesssage('hello :b', false, state)).equal('hello :banana:');
			expect(autocompleteMesssage('hello :bat:', false, state)).equal('hello :black_heart:');
			expect(autocompleteMesssage('hello :black_heart:', true, state)).equal('hello :bat:');
			expect(state).eql({ lastEmoji: ':b' });
		});

		it('does nothing if does not match any emoji', () => {
			const state = { lastEmoji: 'xyz' };
			expect(autocompleteMesssage('hello :abc', false, state)).equal('hello :abc');
		});
	});
});
