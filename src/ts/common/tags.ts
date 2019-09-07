import { CharacterTag, FontPalettes } from './interfaces';
import { hasRole, AccountRoles } from './accountUtils';
import { MOD_COLOR, ADMIN_COLOR, PATREON_COLOR, ANNOUNCEMENT_COLOR, WHITE } from './colors';

const placeholder = { id: '', tagClass: '', label: '' };
const tags: { [key: string]: CharacterTag; } = {
	'mod': { ...placeholder, name: 'moderator', className: 'mod', color: MOD_COLOR },
	'dev': { ...placeholder, name: 'developer', className: 'dev', color: ADMIN_COLOR },
	'dev:art': { ...placeholder, name: 'dev artist', className: 'dev', color: ADMIN_COLOR },
	'dev:music': { ...placeholder, name: 'dev musician', className: 'dev', color: ADMIN_COLOR },
	'sup1': { ...placeholder, name: 'supporter', className: 'sup1', color: PATREON_COLOR },
	'sup2': { ...placeholder, name: 'supporter', className: 'sup2', color: WHITE },
	'sup3': { ...placeholder, name: 'supporter', className: 'sup3', color: WHITE },
	'hidden': { ...placeholder, name: 'hidden', className: 'hidden', color: ANNOUNCEMENT_COLOR },
};

Object.keys(tags).forEach(id => {
	const tag = tags[id];
	tag.id = id;
	tag.label = `<${tag.name.toUpperCase()}>`;
	tag.tagClass = `tag-${tag.className}`;
});

export const emptyTag: CharacterTag = { id: '', name: 'no tag', label: '', className: '', tagClass: '', color: 0 };

export function getAllTags() {
	return Object.keys(tags).map(key => tags[key]);
}

export function getTag(id: string | undefined): CharacterTag | undefined {
	return id ? tags[id] : undefined;
}

export function getTagPalette(tag: CharacterTag, palettes: FontPalettes) {
	switch (tag.id) {
		case 'sup2': return palettes.supporter2;
		case 'sup3': return palettes.supporter3;
		default: return palettes.white;
	}
}

export function canUseTag(account: AccountRoles, tag: string) {
	if (tag === 'mod') {
		return hasRole(account, 'mod');
	} else if (tag === 'dev' || /^dev:/.test(tag)) {
		return hasRole(account, 'dev');
	} else {
		return false;
	}
}

export function getAvailableTags(account: AccountRoles): CharacterTag[] {
	return getAllTags().filter(tag => canUseTag(account, tag.id));
}
