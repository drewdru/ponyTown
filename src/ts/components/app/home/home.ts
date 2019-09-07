import { Component } from '@angular/core';
import { Model, getPonyTag } from '../../services/model';
import { defaultPonyState } from '../../../client/ponyHelpers';
import { GameService } from '../../services/gameService';
import { InstallService } from '../../services/installService';
import { OAuthProvider, PonyObject } from '../../../common/interfaces';

@Component({
	selector: 'home',
	templateUrl: 'home.pug',
	styleUrls: ['home.scss'],
})
export class Home {
	state = defaultPonyState();
	previewPony: PonyObject | undefined = undefined;
	error?: string;
	constructor(
		private gameService: GameService,
		private model: Model,
		private installService: InstallService,
	) {
	}
	get authError() {
		return this.model.authError;
	}
	get accountAlert() {
		return this.model.accountAlert;
	}
	get canInstall() {
		return this.installService.canInstall;
	}
	get playing() {
		return this.gameService.playing;
	}
	get loading() {
		return this.model.loading || this.model.updating;
	}
	get account() {
		return this.model.account;
	}
	get pony() {
		return this.model.pony;
	}
	get previewInfo() {
		return this.previewPony ? this.previewPony.ponyInfo : this.pony.ponyInfo;
	}
	get previewName() {
		return this.previewPony ? this.previewPony.name : this.pony.name;
	}
	get previewTag() {
		return getPonyTag(this.previewPony || this.pony, this.account);
	}
	signIn(provider: OAuthProvider) {
		this.model.signIn(provider);
	}
}
