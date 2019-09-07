import { REV } from '../generated/rev';

/* istanbul ignore next */
export function getUrl(name: string): string {
	if (DEVELOPMENT)
		return `/assets/${name}`;

	if (!REV[name])
		throw new Error(`Cannot find file url (${name})`);

	return `/assets/${name.replace(/(\.\S+)$/, `-${REV[name]}$1`)}`;
}
