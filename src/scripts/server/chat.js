"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const security_1 = require("../common/security");
const interfaces_1 = require("../common/interfaces");
const filterUtils_1 = require("../common/filterUtils");
const expressionUtils_1 = require("../common/expressionUtils");
const swears_1 = require("../common/swears");
const clientUtils_1 = require("../client/clientUtils");
const commands_1 = require("./commands");
const playerUtils_1 = require("./playerUtils");
const friends_1 = require("./services/friends");
const utils_1 = require("../common/utils");
const camera_1 = require("../common/camera");
const constants_1 = require("../common/constants");
function isLaugh(message) {
    return /(^| )(ha(ha)+|he(he)+|ja(ja)+|ха(ха)+|lol|rofl)$/i.test(message);
}
function isIP(match) {
    const parts = match.split(/\./g);
    return !parts.some(p => /^0\d+$/.test(p)) && parts.map(x => parseInt(x, 10)).every(x => x >= 0 && x <= 255);
}
function replaceIP(match) {
    return isIP(match) ? '[LINK]' : match;
}
const urlRegexes = filterUtils_1.urlRegexTexts.map(text => new RegExp(text, 'uig'));
const ipRegex = new RegExp(filterUtils_1.ipRegexText, 'uig');
function replaceLink(value) {
    return filterUtils_1.urlExceptionRegex.test(value) ? value : '[LINK]';
}
function filterUrls(message) {
    message = message.replace(ipRegex, replaceIP);
    for (const regex of urlRegexes) {
        message = message.replace(regex, replaceLink);
    }
    return message;
}
exports.filterUrls = filterUrls;
// non-party messages
function getMessageType(client, type) {
    switch (type) {
        case 0 /* Say */:
        case 1 /* Party */:
            return 0 /* Chat */;
        case 4 /* Supporter */:
            switch (client.supporterLevel) {
                case 1: return 9 /* Supporter1 */;
                case 2: return 10 /* Supporter2 */;
                case 3: return 11 /* Supporter3 */;
                default: return 0 /* Chat */;
            }
        case 5 /* Supporter1 */:
            return client.supporterLevel >= 1 ? 9 /* Supporter1 */ : 0 /* Chat */;
        case 6 /* Supporter2 */:
            return client.supporterLevel >= 2 ? 10 /* Supporter2 */ : 0 /* Chat */;
        case 7 /* Supporter3 */:
            return client.supporterLevel >= 3 ? 11 /* Supporter3 */ : 0 /* Chat */;
        case 2 /* Think */:
        case 3 /* PartyThink */:
            return 5 /* Thinking */;
        case 8 /* Dismiss */:
            return 12 /* Dismiss */;
        case 9 /* Whisper */:
            return 13 /* Whisper */;
        default:
            return utils_1.invalidEnumReturn(type, 0 /* Chat */);
    }
}
exports.createSay = (world, runCommand, log, checkSpam, reportSwears, reportForbidden, reportSuspicious, spamCommands, random, isSuspiciousMessage) => (client, text, chatType, target, settings) => {
    text = clientUtils_1.cleanMessage(text);
    const { command, args, type } = commands_1.parseCommand(text, chatType);
    const whisper = type === 9 /* Whisper */;
    if (!command && !args)
        return;
    if (whisper && client === target)
        return;
    const forbidden = command == null && interfaces_1.isPublicChat(type) && security_1.isForbiddenMessage(args);
    log(client, text, type, forbidden, target);
    const suspicious = isSuspiciousMessage(args, settings);
    if (suspicious !== 0 /* No */) {
        reportSuspicious(client, `${commands_1.getChatPrefix(type)}${text}`, suspicious);
    }
    if (command != null) {
        if (runCommand(client, command, args, type, target, settings)) {
            if (type !== 1 /* Party */ && spamCommands.indexOf(command) !== -1) {
                if (!client.map.instance) {
                    checkSpam(client, text, settings);
                }
            }
        }
        else {
            const expression = expressionUtils_1.parseExpression(text.substr(1));
            if (expression) {
                playerUtils_1.setEntityExpression(client.pony, expression);
            }
            else {
                saySystem(client, 'Invalid command');
            }
        }
    }
    else {
        const message = args;
        const think = type === 2 /* Think */ || type === 3 /* PartyThink */;
        const expression = (think || whisper) ? undefined : expressionUtils_1.parseExpression(message);
        if (expression) {
            playerUtils_1.setEntityExpression(client.pony, expression);
        }
        else if (!whisper && isLaugh(message)) {
            playerUtils_1.execAction(client, 4 /* Laugh */, settings);
        }
        if (interfaces_1.isPartyChat(type)) {
            sayToParty(client, message, think ? 6 /* PartyThinking */ : 4 /* Party */);
        }
        else {
            const friendWhisper = whisper && target !== undefined && friends_1.isFriend(client, target);
            const messageNoLinks = filterUrls(message);
            const messageCensored = forbidden ? lodash_1.repeat('*', messageNoLinks.length) : swears_1.filterBadWords(messageNoLinks);
            const trimmedMessage = filterUtils_1.trimRepeatedLetters(messageNoLinks);
            const trimmedCensored = filterUtils_1.trimRepeatedLetters(messageCensored);
            const messageType = getMessageType(client, type);
            const swearing = messageNoLinks !== messageCensored;
            if (!friendWhisper) {
                if (!client.map.instance) {
                    checkSpam(client, message, settings);
                }
                if (settings.filterSwears && swearing) {
                    reportSwears(client, message, settings);
                }
                if (forbidden) {
                    reportForbidden(client, message, settings);
                }
            }
            if (!friendWhisper && swearing && settings.kickSwearing && random() < 0.75) {
                if (settings.kickSwearingToSpawn) {
                    world.resetToSpawn(client);
                }
                world.kick(client, 'swearing', 1 /* Swearing */);
            }
            else if (!friendWhisper && forbidden) {
                sayTo(client, client.pony, trimmedMessage, messageType);
            }
            else if (whisper) {
                sayWhisper(client, trimmedMessage, trimmedCensored, messageType, target, settings);
            }
            else {
                sayToEveryone(client, trimmedMessage, trimmedCensored, messageType, settings);
            }
        }
    }
};
function sayTo(client, { id }, message, type) {
    client.saysQueue.push([id, message, type]);
}
exports.sayTo = sayTo;
function saySystem(client, message) {
    sayTo(client, client.pony, message, 1 /* System */);
}
exports.saySystem = saySystem;
function sayToClient(client, entity, message, censoredMessage, type, settings) {
    if (client.pony !== entity && !interfaces_1.isWhisperTo(type)) {
        const swear = !!settings.hideSwearing && message !== censoredMessage;
        if (interfaces_1.isPublicMessage(type)) {
            if (swear) {
                return false;
            }
            if (!camera_1.isWorldPointWithPaddingVisible(client.camera, entity, constants_1.tileWidth * 2)) {
                return false;
            }
        }
        if (entity.client) {
            if (playerUtils_1.isIgnored(client, entity.client)) {
                return false;
            }
            if (!client.isMod && playerUtils_1.isHiddenBy(client, entity.client)) {
                return false;
            }
            if (swear && !friends_1.isFriend(client, entity.client)) {
                return false;
            }
        }
        if (client.accountSettings.filterSwearWords || settings.filterSwears) {
            message = censoredMessage;
        }
    }
    sayTo(client, entity, message, type);
    return true;
}
function sayWhisper(client, message, censoredMessage, type, target, settings) {
    if (target === undefined || target.shadowed || playerUtils_1.isHiddenBy(client, target)) {
        saySystem(client, `Couldn't find this player`);
    }
    else {
        const friend = friends_1.isFriend(client, target);
        if (!friend && client.accountSettings.ignoreNonFriendWhispers) {
            saySystem(client, `You can only whisper to friends`);
        }
        else if (!friend && target.accountSettings.ignoreNonFriendWhispers) {
            saySystem(client, `Can't whisper to this player`);
        }
        else {
            sayTo(client, target.pony, message, interfaces_1.toMessageType(type));
            if (!playerUtils_1.isMutedOrShadowed(client)) {
                sayToClient(target, client.pony, message, censoredMessage, type, settings);
            }
        }
    }
}
function sayToParty(client, message, type) {
    if (!client.party) {
        saySystem(client, `you're not in a party`);
    }
    else if (playerUtils_1.isMutedOrShadowed(client)) {
        sayTo(client, client.pony, message, type);
    }
    else {
        for (const c of client.party.clients) {
            sayTo(c, client.pony, message, type);
        }
    }
}
function sayToAll(entity, message, censoredMessage, type, settings) {
    if (entity.region) {
        for (const client of entity.region.clients) {
            sayToClient(client, entity, message, censoredMessage, type, settings);
        }
    }
}
exports.sayToAll = sayToAll;
function sayToEveryone(client, message, censoredMessage, type, settings) {
    if (playerUtils_1.isMutedOrShadowed(client) ||
        client.accountSettings.ignorePublicChat) {
        sayTo(client, client.pony, message, type);
    }
    else {
        sayToAll(client.pony, message, censoredMessage, type, settings);
    }
}
exports.sayToEveryone = sayToEveryone;
function sayToOthers(client, message, type, target, settings) {
    if (interfaces_1.isWhisper(type)) {
        sayWhisper(client, message, message, type, target, settings);
    }
    else if (interfaces_1.isPartyMessage(type)) {
        sayToParty(client, message, type);
    }
    else {
        sayToEveryone(client, message, message, type, settings);
    }
}
exports.sayToOthers = sayToOthers;
exports.sayToClientTest = sayToClient;
exports.sayToPartyTest = sayToParty;
exports.sayWhisperTest = sayWhisper;
//# sourceMappingURL=chat.js.map