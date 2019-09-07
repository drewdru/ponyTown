"use strict";
/// <reference path="../../typings/my.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const passport_google_oauth2_1 = require("@passport-next/passport-google-oauth2");
const passport_twitter_1 = require("passport-twitter");
const passport_facebook_1 = require("@passport-next/passport-facebook");
const passport_github2_1 = require("passport-github2");
const passport_vkontakte_1 = require("passport-vkontakte");
const passport_patreon_1 = require("passport-patreon");
const colors_1 = require("../common/colors");
const color_1 = require("../common/color");
const config_1 = require("./config");
const providerList = [
    {
        id: 'google',
        name: 'Google',
        color: '#DC4A3D',
        strategy: passport_google_oauth2_1.Strategy,
    },
    {
        id: 'twitter',
        name: 'Twitter',
        color: '#55ACEE',
        strategy: passport_twitter_1.Strategy,
    },
    {
        id: 'facebook',
        name: 'Facebook',
        color: '#3765A3',
        strategy: passport_facebook_1.Strategy,
    },
    {
        id: 'github',
        name: 'GitHub',
        color: '#800080',
        strategy: passport_github2_1.Strategy,
    },
    {
        id: 'vkontakte',
        name: 'VKontakte',
        color: '#4C75A3',
        strategy: passport_vkontakte_1.Strategy,
    },
    {
        id: 'patreon',
        name: 'Patreon',
        color: color_1.colorToCSS(colors_1.PATREON_COLOR),
        strategy: passport_patreon_1.Strategy,
    },
];
providerList.forEach(p => p.auth = config_1.config.oauth[p.id]);
providerList.filter(p => p.auth && p.auth.connectOnly).forEach(p => p.connectOnly = true);
exports.providers = providerList.filter(p => !!p.auth);
function getProfileUrl(profile) {
    if (profile.provider === 'twitter') {
        return `https://twitter.com/${profile.username}`;
    }
    else if (profile.provider === 'tumblr') {
        return `http://${profile.username}.tumblr.com/`;
    }
    else if (profile.provider === 'facebook') {
        return `http://www.facebook.com/${profile.id}`;
    }
    else if (profile._json.attributes && profile._json.attributes.url) { // patreon
        return profile._json.attributes.url;
    }
    else {
        return profile.profileUrl || profile._json.url;
    }
}
exports.getProfileUrl = getProfileUrl;
function getProfileEmails(profile) {
    if (profile.emails && profile.emails.length) {
        return profile.emails.map(e => e.value);
    }
    else if (profile._json && profile._json.attributes && profile._json.attributes.email) { // patreon
        return [profile._json.attributes.email];
    }
    else {
        return [];
    }
}
exports.getProfileEmails = getProfileEmails;
function getProfileUsername(profile) {
    return profile.username || profile.displayName || getProfileNameInternal(profile.name);
}
exports.getProfileUsername = getProfileUsername;
function getProfileName(profile) {
    return profile.displayName || profile.username || getProfileNameInternal(profile.name);
}
exports.getProfileName = getProfileName;
function getProfileNameInternal(name) {
    if (!name || lodash_1.isString(name)) {
        return name;
    }
    else {
        return `${name.givenName} ${name.familyName}`.trim();
    }
}
function getProfile(provider, profile) {
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
exports.getProfile = getProfile;
//# sourceMappingURL=oauth.js.map