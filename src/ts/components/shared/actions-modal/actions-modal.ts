import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
	createButtionActionActions, expressionButtonAction, createButtonCommandActions,
	createDefaultButtonActions, actionExpressionDefaultPalette, entityButtonAction, serializeActions, deserializeActions
} from '../../../client/buttonActions';
import * as sprites from '../../../generated/sprites';
import {
	Eye, Muzzle, ColorExtraSet, ColorExtra, Iris, ExpressionExtra, PonyEye, ButtonAction, Action,
	ButtonActionSlot, EntityButtonAction
} from '../../../common/interfaces';
import { createExpression, readFileAsText } from '../../../client/clientUtils';
import { ACTION_EXPRESSION_BG, ACTION_EXPRESSION_EYE_COLOR, fillToOutline } from '../../../common/colors';
import { faLock, faApple, faLaughBeam, faComment, faCog, faCogs } from '../../../client/icons';
import { createEyeSprite } from '../../../client/spriteUtils';
import { times, hasFlag } from '../../../common/utils';
import { PonyTownGame } from '../../../client/game';
import { getEntityNames } from '../../services/model';

function eyeSprite(e: PonyEye | undefined) {
	return createEyeSprite(e, 0, sprites.defaultPalette);
}

@Component({
	selector: 'actions-modal',
	templateUrl: 'actions-modal.pug',
	styleUrls: ['actions-modal.scss'],
})
export class ActionsModal implements OnInit, OnDestroy {
	readonly lockIcon = faLock;
	readonly actionsIcon = faApple;
	readonly expressionsIcon = faLaughBeam;
	readonly chatIcon = faComment;
	readonly optionsIcon = faCog;
	readonly devIcon = faCogs;
	readonly dev = BETA;
	@Output() close = new EventEmitter();
	actions = createButtionActionActions();
	commands = createButtonCommandActions();
	emoteAction = expressionButtonAction(createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Smile));
	entityAction = entityButtonAction('apple');
	entityActions: EntityButtonAction[] = [];
	entityName = 'apple';
	lockEyes = true;
	lockIrises = true;
	eyesLeft: ColorExtraSet = sprites.eyeLeft.map(e => e && e[0]).map(eyeSprite);
	eyesRight: ColorExtraSet = sprites.eyeRight.map(e => e && e[0]).map(eyeSprite);
	irisesLeft: ColorExtraSet = times(Iris.COUNT, i => createEyeSprite(sprites.eyeLeft[1]![0]!, i, sprites.defaultPalette));
	irisesRight: ColorExtraSet = times(Iris.COUNT, i => createEyeSprite(sprites.eyeRight[1]![0]!, i, sprites.defaultPalette));
	muzzles: ColorExtraSet = sprites.noses
		.map(n => n[0][0])
		.map(({ color, colors, mouth }) => ({
			color, colors, extra: mouth, palettes: [actionExpressionDefaultPalette.colors]
		} as ColorExtra));
	noseFills = [ACTION_EXPRESSION_BG];
	noseOutlines = [fillToOutline(ACTION_EXPRESSION_BG)];
	coatFill = ACTION_EXPRESSION_BG;
	eyeColor = ACTION_EXPRESSION_EYE_COLOR;
	muzzle: Muzzle = 0;
	eyeLeft: Eye = 1;
	eyeRight: Eye = 1;
	irisLeft: Iris = 0;
	irisRight: Iris = 0;
	tabIndex = 0;
	blush = false;
	sleeping = false;
	tears = false;
	crying = false;
	hearts = false;
	activeTab = 'right-eye';
	private interval: any = 0;
	private subscription?: Subscription;
	private actionsToUndo: ButtonActionSlot[][] = [];
	constructor(private game: PonyTownGame) {
		this.updateEmoteAction();
	}
	ngOnInit() {
		document.body.classList.add('actions-modal-opened');
		this.game.editingActions = true;
		this.interval = setInterval(() => this.game.send(server => server.action(Action.KeepAlive)), 10000);
		this.subscription = this.game.onLeft.subscribe(() => this.ok());

		if (BETA) {
			this.entityActions = getEntityNames().map(name => entityButtonAction(name));
		}
	}
	ngOnDestroy() {
		document.body.classList.remove('actions-modal-opened');
		this.game.editingActions = false;
		clearInterval(this.interval);
		this.subscription && this.subscription.unsubscribe();
	}
	ok() {
		this.close.emit();
	}
	changed(locked: boolean) {
		if (locked) {
			this.eyeLeft = this.eyeRight;
		}

		if (this.lockIrises) {
			this.irisLeft = this.irisRight;
		}

		this.updateEmoteAction();
	}
	drop(action: ButtonAction) {
		if (action.type === 'expression' && action.expression) {
			const e = action.expression;
			this.lockEyes = e.right === e.left;
			this.lockIrises = e.rightIris === e.leftIris;
			this.eyeRight = e.right;
			this.eyeLeft = e.left;
			this.muzzle = e.muzzle;
			this.irisRight = e.rightIris;
			this.irisLeft = e.leftIris;
			this.blush = hasFlag(e.extra, ExpressionExtra.Blush);
			this.sleeping = hasFlag(e.extra, ExpressionExtra.Zzz);
			this.tears = hasFlag(e.extra, ExpressionExtra.Tears);
			this.crying = hasFlag(e.extra, ExpressionExtra.Cry);
			this.hearts = hasFlag(e.extra, ExpressionExtra.Hearts);
			this.changed(this.lockEyes);
		}
	}
	updateEmoteAction() {
		const extra =
			(this.blush ? ExpressionExtra.Blush : 0) |
			(this.sleeping ? ExpressionExtra.Zzz : 0) |
			(this.tears ? ExpressionExtra.Tears : 0) |
			(this.crying ? ExpressionExtra.Cry : 0) |
			(this.hearts ? ExpressionExtra.Hearts : 0);

		const expression = createExpression(this.eyeRight, this.eyeLeft, this.muzzle, this.irisRight, this.irisLeft, extra);
		this.emoteAction = expressionButtonAction(expression);
	}
	resetToDefault() {
		this.actionsToUndo.push(this.game.actions);
		this.game.actions = [...createDefaultButtonActions(), { action: undefined }];
	}
	clearActionBar() {
		this.actionsToUndo.push(this.game.actions);
		this.game.actions = this.game.actions.map(() => ({ action: undefined }));
	}
	undo() {
		if (this.actionsToUndo.length) {
			this.game.actions = this.actionsToUndo.pop()!;
		}
	}
	updateEntity() {
		if (BETA) {
			this.entityAction = entityButtonAction(this.entityName);
		}
	}
	export() {
		const data = serializeActions(this.game.actions);
		saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), `pony-town-actions.json`);
	}
	async import(file: File | undefined) {
		if (file) {
			const text = await readFileAsText(file);
			this.game.actions = deserializeActions(text);
			this.game.editingActions = false;
			setTimeout(() => this.game.editingActions = true, 500);
		}
	}
}
