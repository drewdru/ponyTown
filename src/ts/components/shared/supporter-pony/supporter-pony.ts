import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { defaultExpression } from '../../../client/ponyUtils';
import { defaultPonyState } from '../../../client/ponyHelpers';
import { SUPPORTER_PONY } from '../../../common/constants';
import { Expression, Muzzle, HeadAnimation, Iris } from '../../../common/interfaces';
import { excite } from '../../../client/ponyAnimations';
import { FrameService, FrameLoop } from '../../services/frameService';
import { CharacterPreview } from '../character-preview/character-preview';
import { decompressPonyString } from '../../../common/compressPony';

const BLEP: Expression = {
	...defaultExpression,
	muzzle: Muzzle.Blep,
};

const EXCITED: Expression = {
	...defaultExpression,
	muzzle: Muzzle.SmileOpen,
};

const DERP: Expression = {
	...defaultExpression,
	muzzle: Muzzle.SmileOpen,
	leftIris: Iris.Up,
};

@Component({
	selector: 'supporter-pony',
	templateUrl: 'supporter-pony.pug',
})
export class SupporterPony implements OnInit, OnDestroy {
	@ViewChild('characterPreview', { static: true }) characterPreview!: CharacterPreview;
	@Input() scale = 3;
	pony = decompressPonyString(SUPPORTER_PONY);
	state = defaultPonyState();
	private expression?: Expression;
	private headAnimation?: HeadAnimation;
	private headTime = 0;
	private loop: FrameLoop;
	constructor(frameService: FrameService) {
		this.loop = frameService.create(delta => this.tick(delta));
	}
	ngOnInit() {
		this.loop.init();
	}
	ngOnDestroy() {
		this.loop.destroy();
	}
	excite() {
		this.headTime = 0;
		this.headAnimation = excite;
		this.expression = Math.random() < 0.2 ? DERP : EXCITED;
	}
	reset() {
		this.expression = undefined;
	}
	private tick(delta: number) {
		this.headTime += delta;

		if (this.headAnimation) {
			const frame = Math.floor(this.headTime * this.headAnimation.fps);

			if (frame >= this.headAnimation.frames.length && !this.headAnimation.loop) {
				this.headAnimation = undefined;
				this.state.headAnimation = undefined;
				this.state.headAnimationFrame = 0;
				this.characterPreview.blink();
			} else {
				this.state.headAnimation = this.headAnimation;
				this.state.headAnimationFrame = frame % this.headAnimation.frames.length;
			}
		} else {
			this.state.headAnimation = undefined;

			if (this.expression) {
				if (Math.random() < 0.01) {
					this.expression = undefined;
				}
			} else {
				if (Math.random() < 0.005) {
					this.expression = BLEP;
				}
			}
		}

		this.state.expression = this.expression;
	}
}
