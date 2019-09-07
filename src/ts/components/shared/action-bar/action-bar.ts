import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { ButtonAction } from '../../../common/interfaces';
import { PonyTownGame } from '../../../client/game';
import { isMobile } from '../../../client/data';
import { useAction, serializeActions } from '../../../client/buttonActions';
import { SettingsService } from '../../services/settingsService';
import { ACTIONS_LIMIT } from '../../../common/constants';
import { last } from '../../../common/utils';

@Component({
	selector: 'action-bar',
	templateUrl: 'action-bar.pug',
	styleUrls: ['action-bar.scss'],
})
export class ActionBar {
	@ViewChild('scroller', { static: true }) scroller!: ElementRef;
	@Input() blurred = false;
	activeAction: ButtonAction | undefined = undefined;
	shortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
	private _editable = false;
	constructor(private game: PonyTownGame, private settings: SettingsService) {
	}
	@Input() get editable() {
		return this._editable;
	}
	set editable(value) {
		if (this._editable !== value) {
			this._editable = value;
			this.updateFreeSlots();

			if (!value) {
				this.save();
			}
		}
	}
	get actions() {
		return this.game.actions;
	}
	get mobile() {
		return isMobile;
	}
	get hasScroller() {
		return this.editable && isMobile;
	}
	get blurCount() {
		const boxWidth = isMobile ? 50 : 40;
		const width = 450 + this.scroller.nativeElement.scrollLeft;
		return Math.floor(width / boxWidth);
	}
	use(action: ButtonAction | undefined) {
		useAction(this.game, action);
	}
	drag(index: number) {
		this.actions[index].action = undefined;
		this.updateFreeSlots();
	}
	drop(action: ButtonAction | undefined, index: number) {
		this.actions[index].action = action;
		this.updateFreeSlots();
	}
	save() {
		const settings = { ...this.settings.account, actions: serializeActions(this.actions) };
		this.settings.saveAccountSettings(settings);
	}
	scroll(e: MouseWheelEvent) {
		if (e.deltaY) {
			const delta = e.deltaY > 0 ? 1 : -1;
			this.scroller.nativeElement.scrollLeft += delta * 20;
		}
	}
	private updateFreeSlots() {
		const actions = this.actions;

		if (this.editable) {
			while (actions.length < 5 || (last(actions)!.action !== undefined && actions.length < ACTIONS_LIMIT)) {
				actions.push({ action: undefined });
			}
		} else {
			while (actions.length > 0 && last(actions)!.action === undefined) {
				actions.pop();
			}
		}
	}
}
