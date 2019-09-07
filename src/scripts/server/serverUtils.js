"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
const adminUtils_1 = require("../common/adminUtils");
const utils_1 = require("../common/utils");
const paths = require("./paths");
function tokenService(socket) {
    return {
        clearTokensForAccount(accountId) {
            socket.clearTokens((_, data) => data.accountId === accountId);
        },
        clearTokensAll() {
            socket.clearTokens(() => true);
        },
        createToken(token) {
            return socket.token(token);
        }
    };
}
exports.tokenService = tokenService;
function isServerOffline(server) {
    return server.state.dead || !!server.state.settings.isServerOffline || !!server.state.shutdown;
}
exports.isServerOffline = isServerOffline;
function toAccountData(account) {
    const { _id, name, birthdate, birthyear, characterCount, roles, settings, flags } = account;
    return {
        id: _id.toString(),
        name, characterCount,
        birthdate: birthdate && utils_1.formatISODate(birthdate) || '',
        birthyear,
        settings: utils_1.cloneDeep(settings || {}),
        supporter: adminUtils_1.supporterLevel(account) || undefined,
        roles: (roles && roles.length) ? [...roles] : undefined,
        flags: (utils_1.hasFlag(flags, 4 /* DuplicatesNotification */) ? 1 /* Duplicates */ : 0) |
            (adminUtils_1.isPastSupporter(account) ? 4 /* PastSupporter */ : 0),
    };
}
exports.toAccountData = toAccountData;
exports.toPonyObjectFields = '_id name info desc site tag lastUsed flags';
function toPonyObject(character) {
    return character ? {
        id: character._id.toString(),
        name: character.name,
        desc: character.desc || '',
        info: character.info || '',
        site: character.site ? character.site.toString() : undefined,
        tag: character.tag || undefined,
        lastUsed: character.lastUsed && character.lastUsed.toISOString(),
        hideSupport: utils_1.hasFlag(character.flags, 4 /* HideSupport */) ? true : undefined,
        respawnAtSpawn: utils_1.hasFlag(character.flags, 8 /* RespawnAtSpawn */) ? true : undefined,
    } : null;
}
exports.toPonyObject = toPonyObject;
function toPonyObjectAdmin(character) {
    return character ? Object.assign({}, toPonyObject(character), { creator: character.creator }) : null;
}
exports.toPonyObjectAdmin = toPonyObjectAdmin;
exports.toSocialSiteFields = '_id name provider url';
function toSocialSite({ _id, name, provider, url }) {
    return { id: _id.toString(), name, provider, url };
}
exports.toSocialSite = toSocialSite;
/* istanbul ignore next */
function execAsync(command, options) {
    return new Promise((resolve, reject) => {
        child_process_1.exec(command, options || {}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve({ stdout, stderr });
            }
        });
    });
}
exports.execAsync = execAsync;
/* istanbul ignore next */
async function logErrorToFile(message, data) {
    const fileName = `error-${Date.now()}.json`;
    const filePath = paths.pathTo('store', fileName);
    await fs.writeFileAsync(filePath, JSON.stringify({ message, data }, null, 2), 'utf8');
    return fileName;
}
exports.logErrorToFile = logErrorToFile;
/* istanbul ignore next */
async function getDiskSpace() {
    // NOTE: add your own code here
    return '';
}
exports.getDiskSpace = getDiskSpace;
/* istanbul ignore next */
async function getCertificateExpirationDate() {
    // NOTE: add your own code here
    return '';
}
exports.getCertificateExpirationDate = getCertificateExpirationDate;
/* istanbul ignore next */
async function getMemoryUsage() {
    // NOTE: add your own code here
    return `0%`;
}
exports.getMemoryUsage = getMemoryUsage;
/* istanbul ignore next */
function handlePromiseDefault(promise, errorHandler = lodash_1.noop) {
    Promise.resolve(promise).catch(errorHandler);
}
exports.handlePromiseDefault = handlePromiseDefault;
function cached(func, cacheTimeout = 1000) {
    const cacheMap = new Map();
    const cachedFunc = (...args) => {
        const cacheKey = JSON.stringify(args);
        const cache = cacheMap.get(cacheKey);
        if (cache) {
            clearTimeout(cache.timeout);
            cache.timeout = setTimeout(() => cacheMap.delete(cacheKey), cacheTimeout);
            return cache.result;
        }
        else {
            const result = func(...args);
            const timeout = setTimeout(() => cacheMap.delete(cacheKey), cacheTimeout);
            cacheMap.set(cacheKey, { result, timeout });
            return result;
        }
    };
    cachedFunc.clear = (...args) => {
        cacheMap.delete(JSON.stringify(args));
    };
    return cachedFunc;
}
exports.cached = cached;
//# sourceMappingURL=serverUtils.js.map