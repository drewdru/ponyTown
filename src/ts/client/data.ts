import { toByteArray } from 'base64-js';
import { ClientOptions, createBinaryReader, readObject } from 'ag-sockets/dist/browser';
import { OAuthProvider } from '../common/interfaces';

/* istanbul ignore next */
function attr(name: string): string | undefined {
	return typeof document !== 'undefined' ? (document.body.getAttribute(name) || undefined) : undefined;
}

/* istanbul ignore next */
function data(id: string): string | undefined {
	const element = typeof document !== 'undefined' ? document.getElementById(id) : undefined;
	return element ? element.innerHTML : undefined;
}

function json<T>(id: string, def: string): T {
	return JSON.parse(data(id) || def);
}

export let isMobile = false;
export const sw = attr('data-sw') === 'true';
export const host = attr('data-host')!;
export const local = attr('data-local') === 'true';
export const token = attr('data-token');
export const version = attr('data-version');
export const isPublic = attr('data-public') === 'true';
export const supporterLink = attr('data-supporter-link');
export const twitterLink = attr('data-twitter-link');
export const contactEmail = attr('data-email');
export const copyrightName = attr('data-copyright');

/* istanbul ignore next */
export const oauthProviders = json<OAuthProvider[]>('oauth-providers', '[]')
	.map(a => <OAuthProvider>{ ...a, url: `/auth/${a.id}` });
/* istanbul ignore next */
export const signUpProviders = oauthProviders.filter(i => !i.connectOnly);
/* istanbul ignore next */
export const signInProviders = oauthProviders.filter(i => i.connectOnly);

/* istanbul ignore next */
export function socketOptions(): ClientOptions {
	const options = data('socket-options');

	if (options) {
		const buffer = toByteArray(options);
		const reader = createBinaryReader(buffer);
		return readObject(reader);
	} else {
		throw new Error('Missing socket options');
	}
}

/* istanbul ignore next */
function setMobile() {
	isMobile = true;
	window.removeEventListener('touchstart', setMobile);
	document.body.classList.add('is-mobile');
}

/* istanbul ignore next */
if (typeof window !== 'undefined') {
	if (!/windows/i.test(navigator.userAgent)) {
		window.addEventListener('touchstart', setMobile);
	}

	if (/Trident/.test(navigator.userAgent)) {
		document.body.classList.add('is-msie');
	}

	if (/YaBrowser/.test(navigator.userAgent)) {
		document.body.classList.add('is-yandex');
	}
}
