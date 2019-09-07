import { Component, Input, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { PonyObject } from '../../../common/interfaces';
import { PLAYER_NAME_MAX_LENGTH } from '../../../common/constants';
import { VERSION_ERROR } from '../../../common/errors';
import { GameService } from '../../services/gameService';
import { Model, createDefaultPonyObject } from '../../services/model';
import { Dropdown } from '../directives/dropdown';
import { faSpinner, faTrash, faTimes, faCheck } from '../../../client/icons';
import { focusElementAfterTimeout } from '../../../client/htmlUtils';
import { delay } from '../../../common/utils';
import { isMobile } from '../../../client/data';

@Component({
	selector: 'character-select',
	templateUrl: 'character-select.pug',
	styleUrls: ['character-select.scss'],
})
export class CharacterSelect {
	readonly maxNameLength = PLAYER_NAME_MAX_LENGTH;
	readonly spinnerIcon = faSpinner;
	readonly deleteIcon = faTrash;
	readonly removeIcon = faTimes;
	readonly confirmIcon = faCheck;
	@Input() newButton = false;
	@Input() editButton = false;
	@Input() removeButton = false;
	@Input() error?: string;
	@Output() errorChange = new EventEmitter<string | undefined>();
	@Output() change = new EventEmitter<PonyObject>();
	@Output() preview = new EventEmitter<PonyObject | undefined>();
	@ViewChild('nameInput', { static: true }) nameInput!: ElementRef;
	@ViewChild('ariaAnnounce', { static: true }) ariaAnnounce!: ElementRef;
	@ViewChild('dropdown', { static: true }) dropdown!: Dropdown;
	removing = false;
	private locked = false; // TEMP: move to model
	constructor(
		private element: ElementRef,
		private router: Router,
		private model: Model,
		private gameService: GameService,
	) {
	}
	get joining() {
		return this.gameService.joining;
	}
	get pony() {
		return this.model.pony;
	}
	get canNew() {
		return !this.joining && this.model.account && this.model.account.characterCount < this.model.characterLimit;
	}
	get canEdit() {
		return !this.joining;
	}
	get canRemove() {
		return !this.joining && !this.locked && !this.model.pending && !!this.pony
			&& !!this.pony.id && this.error !== VERSION_ERROR;
	}
	get hasPonies() {
		return !!this.model.ponies.length;
	}
	select(pony: PonyObject) {
		if (pony) {
			this.removing = false;
			this.model.selectPony(pony);
			this.change.emit(pony);
			this.preview.emit(undefined);
		}

		this.dropdown.close();
		this.focusName();
	}
	createNew() {
		if (this.canNew) {
			this.removing = false;
			this.model.selectPony(createDefaultPonyObject());
			this.change.emit(this.pony);
			this.router.navigate(['/character']);
			this.focusName();
		}
	}
	edit() {
		if (this.canEdit) {
			this.removing = false;
			this.router.navigate(['/character']);
		}
	}
	remove() {
		if (this.canRemove) {
			this.removing = true;
			focusElementAfterTimeout(this.element.nativeElement, '.cancel-remove-button');
		}
	}
	cancelRemove() {
		this.removing = false;
		focusElementAfterTimeout(this.element.nativeElement, '.remove-button');
	}
	confirmRemove() {
		if (this.canRemove) {
			this.setError(undefined);
			this.removing = false;
			this.locked = true;

			this.model.removePony(this.pony)
				.then(() => this.change.emit(this.pony))
				.catch((e: Error) => this.setError(e.message))
				.then(() => this.ariaAnnounce.nativeElement.textContent = 'Character removed')
				.then(() => delay(2000))
				.then(() => this.locked = false)
				.then(() => this.focusName());
		}
	}
	onToggle(show: boolean) {
		if (!show) {
			this.preview.emit(undefined);
		}
	}
	private focusName() {
		if (!isMobile) {
			this.nameInput.nativeElement.focus();
		}
	}
	private setError(error: string | undefined) {
		this.error = error;
		this.errorChange.emit(error);
	}
}
