import { Component, OnInit, OnDestroy } from '@angular/core';
import { clamp } from 'lodash';
import { PLAYER_NAME_MAX_LENGTH, PLAYER_DESC_MAX_LENGTH } from '../../../common/constants';
import {
	PonyInfo, PonyObject, PonyState, SocialSiteInfo, ColorExtraSet, ColorExtra, CharacterTag, PonyEye, Eye, Muzzle,
	Iris, ExpressionExtra
} from '../../../common/interfaces';
import { findById, toInt, cloneDeep, delay } from '../../../common/utils';
import {
	SLEEVED_ACCESSORIES, frontHooves, mergedBackManes, mergedManes, mergedFacialHair, mergedEarAccessories,
	mergedChestAccessories, mergedFaceAccessories, mergedBackAccessories, mergedExtraAccessories, mergedHeadAccessories
} from '../../../client/ponyUtils';
import { defaultPonyState, defaultDrawPonyOptions } from '../../../client/ponyHelpers';
import { toPalette, getBaseFill, syncLockedPonyInfo } from '../../../common/ponyInfo';
import * as sprites from '../../../generated/sprites';
import { boop, trot, stand, sitDownUp, lieDownUp, fly, flyBug } from '../../../client/ponyAnimations';
import { drawCanvas } from '../../../graphics/contextSpriteBatch';
import { Model, getPonyTag } from '../../services/model';
import { loadAndInitSpriteSheets, addTitles, createEyeSprite, addLabels } from '../../../client/spriteUtils';
import { GameService } from '../../services/gameService';
import { TRANSPARENT, BLACK, blushColor } from '../../../common/colors';
import { precompressPony, compressPonyString, decompressPony, decompressPonyString } from '../../../common/compressPony';
import { saveCanvas } from '../../../client/canvasUtils';
import { drawPony } from '../../../client/ponyDraw';
import { getProviderIcon } from '../../shared/sign-in-box/sign-in-box';
import { faPlay, faLock, faSave, faCode, faInfoCircle } from '../../../client/icons';
import { isFileSaverSupported, createExpression, readFileAsText } from '../../../client/clientUtils';
import { emptyTag, getAvailableTags } from '../../../common/tags';
import { ButtMarkEditorState } from '../../shared/butt-mark-editor/butt-mark-editor';
import { parseColorWithAlpha } from '../../../common/color';

const frontHoofTitles = ['', 'Fetlocks', 'Paws', 'Claws', ''];
const backHoofTitles = ['', 'Fetlocks', 'Paws', '', ''];

const horns = addLabels(sprites.horns, [
	'None', 'Unicorn horn', 'Short unicorn horn', 'Curved unicorn horn', 'Tiny deer antlers',
	'Short deer antlers', 'Medium deer antlers', 'Large deer antlers', 'Raindeer antlers', 'Goat horns',
	'Ram horns', 'Buffalo horns', 'Moose horns', 'Bug antenna', 'Long unicorn horn',
]);

const wings = addLabels(sprites.wings[0]!, [
	'None', 'Pegasus wings', 'Bat wings', 'Gryphon wings', 'Bug wings'
]);

const ears = addLabels(sprites.ears, [
	'Regular ears', 'Fluffy ears', 'Long feathered ears', 'Bug ears', 'Short feathered ears', 'Deer ears',
]);

const noses = addTitles(sprites.noses[0], ['Pony muzzle', 'Gryphon beak', 'Deer nose']);

const flyAnimations = [{ ...stand, name: 'fly' }, fly, fly, fly, { ...flyBug, name: 'fly' }];

function eyeSprite(e: PonyEye | undefined) {
	return createEyeSprite(e, 0, sprites.defaultPalette);
}

@Component({
	selector: 'character',
	templateUrl: 'character.pug',
	styleUrls: ['character.scss'],
})
export class Character implements OnInit, OnDestroy {
	readonly debug = DEVELOPMENT || BETA;
	readonly playIcon = faPlay;
	readonly lockIcon = faLock;
	readonly saveIcon = faSave;
	readonly codeIcon = faCode;
	readonly infoIcon = faInfoCircle;
	readonly maxNameLength = PLAYER_NAME_MAX_LENGTH;
	readonly maxDescLength = PLAYER_DESC_MAX_LENGTH;
	readonly horns = horns;
	readonly manes = mergedManes;
	readonly backManes = mergedBackManes;
	readonly tails = sprites.tails[0];
	readonly wings = wings;
	readonly ears = ears;
	readonly facialHair = mergedFacialHair;
	readonly headAccessories = mergedHeadAccessories;
	readonly earAccessories = mergedEarAccessories;
	readonly faceAccessories = mergedFaceAccessories;
	readonly neckAccessories = sprites.neckAccessories[1];
	readonly frontLegAccessories = sprites.frontLegAccessories[1];
	readonly backLegAccessories = sprites.backLegAccessories[1];
	readonly backAccessories = mergedBackAccessories;
	readonly chestAccessories = mergedChestAccessories;
	readonly sleeveAccessories = sprites.frontLegSleeves[1];
	readonly waistAccessories = sprites.waistAccessories[1];
	readonly extraAccessories = mergedExtraAccessories;
	readonly frontHooves = addTitles(frontHooves[1], frontHoofTitles);
	readonly backHooves = addTitles(sprites.backLegHooves[1], backHoofTitles);
	readonly animations = [
		() => stand,
		() => trot,
		() => boop,
		() => sitDownUp,
		() => lieDownUp,
		() => flyAnimations[this.previewInfo!.wings!.type || 0],
	];
	readonly eyelashes: ColorExtraSet = sprites.eyeLeft[1]!.map(eyeSprite);
	readonly eyesLeft: ColorExtraSet = sprites.eyeLeft.map(e => e && e[0]).map(eyeSprite);
	readonly eyesRight: ColorExtraSet = sprites.eyeRight.map(e => e && e[0]).map(eyeSprite);
	readonly noses = noses;
	readonly heads = sprites.head1[1];
	readonly buttMarkState: ButtMarkEditorState = {
		brushType: 'brush',
		brush: 'orange',
	};
	muzzles: ColorExtraSet;
	fangs: ColorExtraSet;
	tags: CharacterTag[] = [
		emptyTag,
	];
	state = defaultPonyState();
	saved: PonyInfo[] = [];
	activeAnimation = 0;
	loaded = false;
	playAnimation = true;
	deleting = false;
	fixed = false;
	previewExtra = false;
	previewPony: PonyObject | undefined = undefined;
	sites: SocialSiteInfo[] = [];
	error?: string;
	canSaveFiles = isFileSaverSupported();
	private savingLocked = false;
	private interval?: any;
	private syncTimeout?: any;
	private animationTime = 0;
	constructor(private gameService: GameService, private model: Model) {
		this.createMuzzles();
		this.updateMuzzles();
	}
	private getMuzzleType() {
		return clamp(toInt(this.info && this.info.nose && this.info.nose.type), 0, sprites.noses[0].length);
	}
	createMuzzles() {
		const type = this.getMuzzleType();
		const happy = sprites.noses[0][type][0];

		this.muzzles = sprites.noses
			.slice()
			.map(n => n[type][0])
			.map(({ color, colors, mouth }) => ({ color, colors, extra: mouth, palettes: [sprites.defaultPalette] } as ColorExtra));

		this.fangs = [undefined, { color: happy.color, colors: 3, extra: happy.fangs, palettes: [sprites.defaultPalette] }];
	}
	updateMuzzles() {
		const type = this.getMuzzleType();
		const happy = sprites.noses[0][type][0];

		this.muzzles!.forEach((m, i) => {
			if (m) {
				const { color, colors, mouth } = sprites.noses[i][type][0];
				m.color = color;
				m.colors = colors;
				m.extra = mouth;
				m.timestamp = Date.now();
			}
		});

		const fangs = this.fangs![1]!;
		fangs.color = happy.color;
		fangs.extra = happy.fangs;
		fangs.timestamp = Date.now();
	}
	get account() {
		return this.model.account;
	}
	get loading() {
		return this.model.loading || this.model.updating;
	}
	get updateWarning() {
		return this.gameService.updateWarning;
	}
	get playing() {
		return this.gameService.playing;
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
	get customOutlines() {
		return this.info.customOutlines;
	}
	get ponies() {
		return this.model.ponies;
	}
	get pony() {
		return this.model.pony;
	}
	set pony(value: PonyObject) {
		this.model.selectPony(value);
	}
	get info() {
		return this.pony.ponyInfo!;
	}
	get maneFill() {
		return getBaseFill(this.info.mane);
	}
	get coatFill() {
		return this.info.coatFill;
	}
	get hoovesFill() {
		return getBaseFill(this.info.frontHooves);
	}
	get canExport() {
		return DEVELOPMENT;
	}
	get site() {
		return findById(this.sites, this.pony.site) || this.sites[0];
	}
	set site(value: SocialSiteInfo) {
		this.pony.site = value.id;
	}
	get tag() {
		return findById(this.tags, this.pony.tag) || this.tags[0];
	}
	set tag(value: CharacterTag) {
		this.pony.tag = value.id;
	}
	get lockEyeWhites() {
		return !this.info.unlockEyeWhites;
	}
	set lockEyeWhites(value) {
		this.info.unlockEyeWhites = !value;
	}
	get darken() {
		return !this.info.freeOutlines;
	}
	get lockFrontLegAccessory() {
		return !this.info.unlockFrontLegAccessory;
	}
	set lockFrontLegAccessory(value) {
		this.info.unlockFrontLegAccessory = !value;
	}
	get lockBackLegAccessory() {
		return !this.info.unlockBackLegAccessory;
	}
	set lockBackLegAccessory(value) {
		this.info.unlockBackLegAccessory = !value;
	}
	get lockEyelashColor() {
		return !this.info.unlockEyelashColor;
	}
	set lockEyelashColor(value) {
		this.info.unlockEyelashColor = !value;
	}
	icon(id: string) {
		return getProviderIcon(id);
	}
	hasSleeves(type: number) {
		return SLEEVED_ACCESSORIES.indexOf(type) !== -1;
	}
	ngOnInit() {
		if (this.model.account) {
			this.tags.push(...getAvailableTags(this.model.account));
		}

		this.sites = this.model.sites.filter(s => !!s.name);
		this.updateMuzzles();

		let last = Date.now();

		return loadAndInitSpriteSheets().then(() => {
			this.loaded = true;
			this.interval = setInterval(() => {
				const now = Date.now();
				this.update((now - last) / 1000);
				last = now;
			}, 1000 / 24);
		});
	}
	ngOnDestroy() {
		clearInterval(this.interval);
	}
	changed() {
		if (!this.syncTimeout) {
			this.syncTimeout = requestAnimationFrame(() => {
				this.syncTimeout = undefined;
				syncLockedPonyInfo(this.info);
			});
		}

		if (DEVELOPMENT || BETA) {
			this.state.blushColor = blushColor(parseColorWithAlpha(this.coatFill || '', 1));
		}
	}
	update(delta: number) {
		this.animationTime += delta;

		const animation = this.animations[this.activeAnimation]();
		this.state.animation = animation;

		if (this.playAnimation) {
			this.state.animationFrame = Math.floor(this.animationTime * animation.fps) % animation.frames.length;
		}
	}
	copyCoatColorToTail() {
		if (this.info.tail && this.info.tail.fills) {
			this.info.tail.fills[0] = this.info.coatFill;
			this.changed();
		}
	}
	eyeColorLockChanged(locked: boolean) {
		if (locked) {
			this.info.eyeColorLeft = this.info.eyeColorRight;
		}
	}
	eyeWhiteLockChanged(locked: boolean) {
		if (locked) {
			this.info.eyeWhitesLeft = this.info.eyeWhites;
		}
	}
	eyeOpennessChanged(locked: boolean) {
		if (locked) {
			this.info.eyeOpennessLeft = this.info.eyeOpennessRight;
		}
	}
	eyelashLockChanged(locked: boolean) {
		if (locked) {
			this.info.eyelashColorLeft = this.info.eyelashColor;
		}
	}
	select(pony: PonyObject | undefined) {
		if (pony) {
			this.deleting = false;
			this.pony = pony;
		}
	}
	setActiveAnimation(index: number) {
		this.activeAnimation = index;
		this.animationTime = 0;
	}
	freeOutlinesChanged(_free: boolean) {
		this.changed();
	}
	darkenLockedOutlinesChanged(_darken: boolean) {
		this.changed();
	}
	get canSave() {
		return !this.model.pending && !!this.pony && !!this.pony.name && !this.savingLocked;
	}
	save() {
		if (this.canSave) {
			this.error = undefined;
			this.deleting = false;
			this.savingLocked = true;

			this.model.savePony(this.pony)
				.catch((e: Error) => this.error = e.message)
				.then(() => delay(2000))
				.then(() => this.savingLocked = false);
		}
	}
	get canRevert() {
		return !!findById(this.ponies, this.pony.id);
	}
	revert() {
		if (this.canRevert) {
			this.select(findById(this.ponies, this.pony.id));
		}
	}
	get canDuplicate() {
		return this.ponies.length < this.model.characterLimit;
	}
	duplicate() {
		if (this.canDuplicate) {
			this.deleting = false;
			this.pony = cloneDeep(this.pony);
			this.pony.name = '';
			this.pony.id = '';
		}
	}
	export(index?: number) {
		const frameWidth = 80;
		const frameHeight = 90;
		const animations = index === undefined ? this.animations.map(a => a()) : [this.animations[index]()];
		const frames = animations.reduce((sum, a) => sum + a.frames.length, 0);
		const info = toPalette(this.info);
		const options = defaultDrawPonyOptions();

		const canvas = drawCanvas(frameWidth * frames, frameHeight, sprites.paletteSpriteSheet, TRANSPARENT, batch => {
			let i = 0;

			animations.forEach(a => {
				for (let f = 0; f < a.frames.length; f++ , i++) {
					const state: PonyState = {
						...defaultPonyState(),
						animation: a,
						animationFrame: f,
						blinkFrame: 1,
					};

					drawPony(batch, info, state, i * frameWidth + frameWidth / 2, frameHeight - 10, options);
				}
			});
		});

		const name = animations.length === 1 ? animations[0].name : 'all';
		saveCanvas(canvas, `${this.pony.name}-${name}.png`);
	}
	import() {
		if (DEVELOPMENT) {
			const data = prompt('enter data');

			if (data) {
				this.importPony(data);
			}
		}
	}
	private importPony(data: string) {
		if (DEVELOPMENT) {
			this.pony.ponyInfo = decompressPonyString(data, true);
			const t = decompressPonyString(data, false);
			console.log(JSON.stringify(t, undefined, 2));
		}
	}
	addBlush() {
		if (DEVELOPMENT || BETA) {
			this.state = {
				...this.state,
				expression: createExpression(Eye.Neutral, Eye.Neutral, Muzzle.Smile, Iris.Forward, Iris.Forward, ExpressionExtra.Blush),
			};
			this.changed();
		}
	}
	testSize() {
		function stringifyValues(values: any[]): string {
			return values.map(x => JSON.stringify(x)).join(typeof values[0] === 'object' ? ',\n\t' : ', ');
		}

		if (DEVELOPMENT) {
			const compressed = compressPonyString(this.info);
			const regularSize = JSON.stringify(this.info).length;
			const ponyInfoNumber = decompressPony(compressed);
			const precomp = precompressPony(ponyInfoNumber, BLACK, x => x) as any;
			const details = Object.keys(precomp)
				.filter(key => key !== 'version')
				.map(key => ({ key, values: precomp[key] || [] as any[] }))
				.map(({ key, values }) => `${key}: [\n\t${stringifyValues(values)}\n]`)
				.join(',\n');
			const serialized = compressPonyString(this.info);

			console.log(serialized);
			console.log(details);
			console.log(`${serialized.length} / ${regularSize}`);
		}
	}
	testJSON() {
		if (DEVELOPMENT) {
			console.log(JSON.stringify(this.info, undefined, 2));
		}
	}
	exportPony() {
		const data = ponyToExport(this.pony) + '\r\n';
		saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), `${this.pony.name}.txt`);
	}
	exportPonies() {
		const data = this.ponies.map(ponyToExport).join('\r\n') + '\r\n';
		saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), 'ponies.txt');
	}
	async importPonies(file: File | undefined) {
		if (file) {
			const text = await readFileAsText(file);
			const lines = text.split(/\r?\n/g);
			let imported = 0;

			for (const line of lines) {
				try {
					const [name, info, desc = ''] = line.split(/\t/g);

					if (name && info) {
						const pony: PonyObject = {
							name,
							id: '',
							info,
							desc,
							ponyInfo: decompressPonyString(info, true),
						};

						await this.model.savePony(pony, true);
						imported++;
					}
				} catch (e) {
					DEVELOPMENT && console.error(e);
				}
			}

			alert(`Imported ${imported} ponies`);
		}
	}
}

function ponyToExport(pony: PonyObject) {
	return `${pony.name}\t${pony.info}\t${pony.desc || ''}`.trim();
}
