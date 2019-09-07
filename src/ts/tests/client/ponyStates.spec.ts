import '../lib';
import { expect } from 'chai';
import {
	trotting, flying, standing, lying, sitting, hovering, toBoopState, booping, boopingSitting,
	boopingLying, boopingFlying, sittingDown, isFlyingUp, flyingUp, trottingToFlying, flyingToTrotting,
	flyingDown, isFlyingUpOrDown, isFlyingDown
} from '../../client/ponyStates';
import { EntityState } from '../../common/interfaces';
import { flagsToState } from '../../common/pony';

describe('ponyStates', () => {
	describe('flagsToState()', () => {
		it('returns trotting if moving', () => {
			expect(flagsToState(EntityState.PonyStanding, true, false)).equal(trotting);
		});

		it('returns flying if moving and flying', () => {
			expect(flagsToState(EntityState.PonyFlying, true, false)).equal(flying);
		});

		it('returns standing for standing state', () => {
			expect(flagsToState(EntityState.PonyStanding, false, false)).equal(standing);
		});

		it('returns trotting for walking state', () => {
			expect(flagsToState(EntityState.PonyWalking, false, false)).equal(trotting);
		});

		it('returns trotting for trotting state', () => {
			expect(flagsToState(EntityState.PonyTrotting, false, false)).equal(trotting);
		});

		it('returns sitting for sitting state', () => {
			expect(flagsToState(EntityState.PonySitting, false, false)).equal(sitting);
		});

		it('returns lying for lying state', () => {
			expect(flagsToState(EntityState.PonyLying, false, false)).equal(lying);
		});

		it('returns hovering for flying state', () => {
			expect(flagsToState(EntityState.PonyFlying, false, false)).equal(hovering);
		});

		it('throws on invalid state', () => {
			expect(() => flagsToState(112, false, false)).throw('Invalid pony state (112)');
		});
	});

	describe('isFlyingUp()', () => {
		it('returns true if flying up', () => {
			expect(isFlyingUp(flyingUp)).true;
		});

		it('returns true if transitioning from trotting to flying', () => {
			expect(isFlyingUp(trottingToFlying)).true;
		});

		it('returns false for any other state', () => {
			expect(isFlyingUp(standing)).false;
		});
	});

	describe('isFlyingDown()', () => {
		it('returns true if flying down', () => {
			expect(isFlyingDown(flyingDown)).true;
		});

		it('returns true if transitioning from flying to trotting', () => {
			expect(isFlyingDown(flyingToTrotting)).true;
		});

		it('returns false for any other state', () => {
			expect(isFlyingDown(standing)).false;
		});
	});

	describe('isFlyingUpOrDown()', () => {
		it('returns true if flying up', () => {
			expect(isFlyingUpOrDown(flyingUp)).true;
		});

		it('returns true if transitioning from trotting to flying', () => {
			expect(isFlyingUpOrDown(trottingToFlying)).true;
		});

		it('returns true if flying down', () => {
			expect(isFlyingUpOrDown(flyingDown)).true;
		});

		it('returns true if transitioning from flying to trotting', () => {
			expect(isFlyingUpOrDown(flyingToTrotting)).true;
		});

		it('returns false for any other state', () => {
			expect(isFlyingUpOrDown(standing)).false;
		});
	});

	describe('toBoopState()', () => {
		it('returns booping for standing state', () => {
			expect(toBoopState(standing)).equal(booping);
		});

		it('returns boopingSitting for sitting state', () => {
			expect(toBoopState(sitting)).equal(boopingSitting);
		});

		it('returns boopingLying for lying state', () => {
			expect(toBoopState(lying)).equal(boopingLying);
		});

		it('returns boopingFlying for hovering state', () => {
			expect(toBoopState(hovering)).equal(boopingFlying);
		});

		it('returns undefined for all other states', () => {
			expect(toBoopState(sittingDown)).undefined;
		});
	});
});
