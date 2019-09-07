/// <reference path="../../typings/my.d.ts" />

import { Request } from 'express';
import { isString } from 'lodash';
import { Strategy as GoogleStrategy } from '@passport-next/passport-google-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as FacebookStrategy } from '@passport-next/passport-facebook';
import { Strategy as GithubStrategy } from 'passport-github2';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import { Strategy as PatreonStrategy } from 'passport-patreon';
import { Profile } from '../common/interfaces';
import { PATREON_COLOR } from '../common/colors';
import { colorToCSS } from '../common/color';
import { config } from './config';
import { IAccount } from './db';

export type OAuthProfileName = string | { familyName: string; givenName: string; };

export interface OAuthProfile {
	id?: string;
	name?: OAuthProfileName;
	username?: string;
	displayName?: string;
	emails?: { value: string; }[];
	provider: string;
	gender?: string;
	profileUrl?: string;
	_raw: string;
	_json: any;
}

export interface Strategy {
	new(
		options: any,
		callback: (
			req: Request,
			accessToken: string,
			refreshToken: string,
			profile: OAuthProfile,
			callback: (err: Error | null, user: IAccount | null) => void) => void): any;
}

export interface OAuthProviderInfo {
	id: string;
	name: string;
	color: string;
	strategy: Strategy;
	auth?: any;
	connectOnly?: boolean;
	additionalOptions?: any;
}

const providerList: OAuthProviderInfo[] = [
	{
		id: 'google',
		name: 'Google',
		color: '#DC4A3D',
		strategy: GoogleStrategy,
	},
	{
		id: 'twitter',
		name: 'Twitter',
		color: '#55ACEE',
		strategy: TwitterStrategy,
	},
	{
		id: 'facebook',
		name: 'Facebook',
		color: '#3765A3',
		strategy: FacebookStrategy,
	},
	{
		id: 'github',
		name: 'GitHub',
		color: '#800080',
		strategy: GithubStrategy,
	},
	{
		id: 'vkontakte',
		name: 'VKontakte',
		color: '#4C75A3',
		strategy: VKontakteStrategy,
	},
	{
		id: 'patreon',
		name: 'Patreon',
		color: colorToCSS(PATREON_COLOR),
		strategy: PatreonStrategy,
	},
];

providerList.forEach(p => p.auth = config.oauth[p.id]);
providerList.filter(p => p.auth && p.auth.connectOnly).forEach(p => p.connectOnly = true);

export const providers = providerList.filter(p => !!p.auth);

export function getProfileUrl(profile: OAuthProfile): string | undefined {
	if (profile.provider === 'twitter') {
		return `https://twitter.com/${profile.username}`;
	} else if (profile.provider === 'tumblr') {
		return `http://${profile.username}.tumblr.com/`;
	} else if (profile.provider === 'facebook') {
		return `http://www.facebook.com/${profile.id}`;
	} else if (profile._json.attributes && profile._json.attributes.url) { // patreon
		return profile._json.attributes.url;
	} else {
		return profile.profileUrl || profile._json.url;
	}
}

export function getProfileEmails(profile: OAuthProfile): string[] {
	if (profile.emails && profile.emails.length) {
		return profile.emails.map(e => e.value);
	} else if (profile._json && profile._json.attributes && profile._json.attributes.email) { // patreon
		return [profile._json.attributes.email];
	} else {
		return [];
	}
}

export function getProfileUsername(profile: OAuthProfile): string | undefined {
	return profile.username || profile.displayName || getProfileNameInternal(profile.name);
}

export function getProfileName(profile: OAuthProfile): string | undefined {
	return profile.displayName || profile.username || getProfileNameInternal(profile.name);
}

function getProfileNameInternal(name: OAuthProfileName | undefined): string | undefined {
	if (!name || isString(name)) {
		return name;
	} else {
		return `${name.givenName} ${name.familyName}`.trim();
	}
}

export function getProfile(provider: string, profile: OAuthProfile): Profile {
	const emails = getProfileEmails(profile).map(e => e.toLowerCase());

	return {
		id: profile.id || profile.username || '',
		provider: profile.provider || provider,
		username: getProfileUsername(profile) || emails[0],
		name: getProfileName(profile) || emails[0],
		emails,
		url: getProfileUrl(profile),
		createdAt: profile._json && profile._json.created_at && new Date(profile._json.created_at),
		suspended: profile._json && profile._json.suspended,
	};
}
