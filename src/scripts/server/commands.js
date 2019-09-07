"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const interfaces_1 = require("../common/interfaces");
const accountUtils_1 = require("../common/accountUtils");
const entities_1 = require("../common/entities");
const emoji_1 = require("../client/emoji");
const userError_1 = require("./userError");
const expressionUtils_1 = require("../common/expressionUtils");
const swears_1 = require("../common/swears");
const stringUtils_1 = require("../common/stringUtils");
const playerUtils_1 = require("./playerUtils");
const utils_1 = require("../common/utils");
const internal_1 = require("./api/internal");
const logger_1 = require("./logger");
const paths_1 = require("./paths");
const chat_1 = require("./chat");
const serverRegion_1 = require("./serverRegion");
const serverMap_1 = require("./serverMap");
const constants_1 = require("../common/constants");
const worldMap_1 = require("../common/worldMap");
const characterUtils_1 = require("./characterUtils");
const fs_1 = require("fs");
const db_1 = require("./db");
const houseMap_1 = require("./maps/houseMap");
function hasRoleNull(client, role) {
    if (!role || accountUtils_1.hasRole(client.account, role))
        return true;
    return (role === 'sup1' && (client.supporterLevel >= 1 || client.isMod)) ||
        (role === 'sup2' && (client.supporterLevel >= 2 || client.isMod)) ||
        (role === 'sup3' && (client.supporterLevel >= 3 || client.isMod));
}
function command(names, help, role, handler, spam = false) {
    return { names, help, role, handler, spam };
}
function emote(names, expr, timeout, cancellable) {
    return command(names, '', '', ({}, { pony }) => playerUtils_1.setEntityExpression(pony, expr, timeout, cancellable));
}
function action(names, action) {
    return command(names, '', '', ({}, client, _, __, ___, settings) => playerUtils_1.execAction(client, action, settings));
}
function adminModChat(names, help, role, type) {
    return command(names, help, role, ({}, client, message, _, __, settings) => {
        chat_1.sayToEveryone(client, message, swears_1.filterBadWords(message), type, settings);
    });
}
function parseSeason(value) {
    switch (value.toLowerCase()) {
        case 'spring': return 8 /* Spring */;
        case 'summer': return 1 /* Summer */;
        case 'autumn': return 2 /* Autumn */;
        case 'winter': return 4 /* Winter */;
        default: return undefined;
    }
}
function parseHoliday(value) {
    switch (value.toLowerCase()) {
        case 'none': return 0 /* None */;
        case 'halloween': return 2 /* Halloween */;
        case 'christmas': return 1 /* Christmas */;
        default: return undefined;
    }
}
function parseWeather(value) {
    switch (value.toLowerCase()) {
        case 'none': return 0 /* None */;
        case 'rain': return 1 /* Rain */;
        default: return undefined;
    }
}
function getSpawnTarget(map, message) {
    if (message === 'spawn') {
        return utils_1.randomPoint(map.spawnArea);
    }
    const spawn = map.spawns.get(message);
    if (spawn) {
        return utils_1.randomPoint(spawn);
    }
    const match = /^(\d+) (\d+)$/.exec(message.trim());
    if (!match) {
        throw new userError_1.UserError('invalid parameters');
    }
    const [, tx, ty] = match;
    const x = utils_1.clamp(+tx, 0, map.width - 0.5 / constants_1.tileWidth);
    const y = utils_1.clamp(+ty, 0, map.height - 0.5 / constants_1.tileHeight);
    return { x, y };
}
function execWithFileName(client, message, action) {
    const fileName = message.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!fileName) {
        throw new userError_1.UserError('invalid file name');
    }
    action(fileName)
        .catch(e => (logger_1.logger.error(e), e.message))
        .then(error => chat_1.saySystem(client, error || 'saved'));
}
function shouldNotBeCalled() {
    throw new Error('Should not be called');
}
function isValidMapForEditing(map, client, checkTimeout, onlyLeader) {
    if (map.id !== 'house') {
        chat_1.saySystem(client, 'Can only be done inside the house');
        return false;
    }
    if (checkTimeout && ((Date.now() - client.lastMapLoadOrSave) < constants_1.MAP_LOAD_SAVE_TIMEOUT)) {
        chat_1.saySystem(client, `You need to wait ${Math.floor(constants_1.MAP_LOAD_SAVE_TIMEOUT / 1000)} seconds before loading or saving again`);
        return false;
    }
    if (onlyLeader && client.party && client.party.leader !== client) {
        chat_1.saySystem(client, 'Only party leader can do this');
        return false;
    }
    return true;
}
let interval;
function createCommands(world) {
    const commands = lodash_1.compact([
        // chat
        command(['help', 'h', '?'], '/help - show help', '', ({}, client) => {
            const help = commands
                .filter(c => c.help && hasRoleNull(client, c.role))
                .map(c => c.help)
                .join('\n');
            chat_1.saySystem(client, help);
        }),
        command(['roll', 'rand', 'random'], '/roll [[min-]max] - randomize a number', '', ({ random }, client, args, type, target, settings) => {
            const ROLL_MAX = 1000000;
            const [, min, max] = /^(?:(\d+)-)?(\d+)$/.exec(args) || ['', '', ''];
            const minValue = utils_1.clamp((min ? parseInt(min, 10) : 1) | 0, 0, ROLL_MAX);
            const maxValue = utils_1.clamp((max ? parseInt(max, 10) : 100) | 0, minValue, ROLL_MAX);
            const result = args === '🍎' ? args : random(minValue, maxValue);
            const message = `🎲 rolled ${result} of ${minValue !== 1 ? `${minValue}-` : ''}${maxValue}`;
            chat_1.sayToOthers(client, message, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }, true),
        command(['s', 'say'], '/s - say', '', shouldNotBeCalled),
        command(['p', 'party'], '/p - party chat', '', shouldNotBeCalled),
        command(['t', 'think'], '/t - thinking balloon', '', shouldNotBeCalled),
        command(['w', 'whisper'], '/w <name> - whisper to player', '', shouldNotBeCalled),
        command(['r', 'reply'], '/r - reply to whisper', '', shouldNotBeCalled),
        command(['e'], '/e - set permanent expression', '', ({}, { pony }, message) => {
            pony.exprPermanent = expressionUtils_1.parseExpression(message);
            playerUtils_1.setEntityExpression(pony, undefined, 0);
        }),
        // actions
        command(['turn'], '/turn - turn head', '', ({}, client, _, __, ___, settings) => {
            playerUtils_1.execAction(client, 2 /* TurnHead */, settings);
        }),
        command(['boop', ')'], '/boop or /) - a boop', '', ({}, client, message, _, __, settings) => {
            const expression = expressionUtils_1.parseExpression(message);
            if (expression) {
                playerUtils_1.setEntityExpression(client.pony, expression, 800);
            }
            playerUtils_1.execAction(client, 1 /* Boop */, settings);
        }),
        command(['drop'], '/drop - drop held item', '', ({}, client, _, __, ___, settings) => {
            playerUtils_1.execAction(client, 14 /* Drop */, settings);
        }),
        command(['droptoy'], '/droptoy - drop held toy', '', ({}, client, _, __, ___, settings) => {
            playerUtils_1.execAction(client, 15 /* DropToy */, settings);
        }),
        // command(['open'], '/open - open gift', '', ({ }, client) => {
        // 	openGift(client);
        // }),
        // counters
        command(['gifts'], '/gifts - show gift score', '', ({}, client, _, type, target, settings) => {
            chat_1.sayToOthers(client, `collected ${playerUtils_1.getCounter(client, 'gifts')} 🎁`, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }, true),
        command(['candies', 'candy'], '/candies - show candy score', '', ({}, client, _, type, target, settings) => {
            chat_1.sayToOthers(client, `collected ${playerUtils_1.getCounter(client, 'candies')} 🍬`, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }, true),
        command(['eggs'], '/eggs - show egg score', '', ({}, client, _, type, target, settings) => {
            chat_1.sayToOthers(client, `collected ${playerUtils_1.getCounter(client, 'eggs')} 🥚`, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }, true),
        command(['clovers', 'clover'], '/clovers - show clover score', '', ({}, client, _, type, target, settings) => {
            chat_1.sayToOthers(client, `collected ${playerUtils_1.getCounter(client, 'clovers')} 🍀`, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }, true),
        command(['toys'], '/toys - show number of collected toys', '', ({}, client, _, type, target, settings) => {
            const { collected, total } = playerUtils_1.getCollectedToysCount(client);
            chat_1.sayToOthers(client, `collected ${collected}/${total} toys`, interfaces_1.toAnnouncementMessageType(type), target, settings);
        }),
        // other
        command(['unstuck'], '/unstuck - respawn at spawn point', '', ({ world }, client) => {
            world.resetToSpawn(client);
            world.kick(client, '/unstuck');
        }),
        command(['leave'], '/leave - leave the game', '', ({ world }, client) => {
            world.kick(client, '/leave');
        }),
        // pony states
        command(['sit'], '/sit - sit down or stand up', '', shouldNotBeCalled),
        command(['lie', 'lay'], '/lie - lie down or sit up', '', shouldNotBeCalled),
        command(['fly'], '/fly - fly up or fly down', '', shouldNotBeCalled),
        command(['stand'], '/stand - stand up', '', shouldNotBeCalled),
        // emotes
        command(['blush'], '', '', ({}, { pony }, message) => playerUtils_1.playerBlush(pony, message)),
        command(['love', '<3'], '', '', ({}, { pony }, message) => playerUtils_1.playerLove(pony, message)),
        command(['sleep', 'zzz'], '', '', ({}, { pony }, message) => playerUtils_1.playerSleep(pony, message)),
        command(['cry'], '', '', ({}, { pony }, message) => playerUtils_1.playerCry(pony, message)),
        // expressions
        emote(['smile', 'happy'], expressionUtils_1.expression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */)),
        emote(['frown'], expressionUtils_1.expression(1 /* Neutral */, 1 /* Neutral */, 1 /* Frown */)),
        emote(['angry'], expressionUtils_1.expression(19 /* Angry */, 19 /* Angry */, 1 /* Frown */)),
        emote(['sad'], expressionUtils_1.expression(15 /* Sad */, 15 /* Sad */, 1 /* Frown */)),
        emote(['thinking'], expressionUtils_1.expression(1 /* Neutral */, 8 /* Frown2 */, 7 /* Concerned */)),
        // actions
        action(['yawn'], 3 /* Yawn */),
        action(['laugh', 'lol', 'haha', 'хаха', 'jaja'], 4 /* Laugh */),
        action(['sneeze', 'achoo'], 5 /* Sneeze */),
        action(['magic'], 26 /* Magic */),
        // house
        command(['savehouse'], '/savehouse - saves current house setup', '', async ({}, client) => {
            if (!isValidMapForEditing(client.map, client, true, false))
                return;
            client.lastMapLoadOrSave = Date.now();
            const savedMap = JSON.stringify(serverMap_1.saveMap(client.map, { saveTiles: true, saveEntities: true, saveWalls: true, saveOnlyEditableEntities: true }));
            DEVELOPMENT && console.log(savedMap);
            client.account.savedMap = savedMap;
            await db_1.Account.updateOne({ _id: client.accountId }, { savedMap }).exec();
            chat_1.saySystem(client, 'Saved');
            client.reporter.systemLog(`Saved house`);
        }),
        command(['loadhouse'], '/loadhouse - loads saved house setup', '', ({ world }, client) => {
            if (!isValidMapForEditing(client.map, client, true, true))
                return;
            if (!client.account.savedMap)
                return chat_1.saySystem(client, 'No saved map state');
            client.lastMapLoadOrSave = Date.now();
            serverMap_1.loadMap(world, client.map, JSON.parse(client.account.savedMap), { loadEntities: true, loadWalls: true, loadEntitiesAsEditable: true });
            chat_1.saySystem(client, 'Loaded');
            client.reporter.systemLog(`Loaded house`);
        }),
        command(['resethouse'], '/resethouse - resets house setup to original state', '', ({}, client) => {
            if (!isValidMapForEditing(client.map, client, true, true))
                return;
            client.lastMapLoadOrSave = Date.now();
            if (houseMap_1.defaultHouseSave) {
                serverMap_1.loadMap(world, client.map, houseMap_1.defaultHouseSave, { loadEntities: true, loadWalls: true, loadEntitiesAsEditable: true });
            }
            chat_1.saySystem(client, 'Reset');
            client.reporter.systemLog(`Reset house`);
        }),
        command(['lockhouse'], '/lockhouse - prevents other people from changing the house', '', ({}, client) => {
            if (!isValidMapForEditing(client.map, client, false, true))
                return;
            client.map.editingLocked = true;
            chat_1.saySystem(client, 'House locked');
            client.reporter.systemLog(`House locked`);
        }),
        command(['unlockhouse'], '/unlockhouse - enables editing by other people', '', ({}, client) => {
            if (!isValidMapForEditing(client.map, client, false, true))
                return;
            client.map.editingLocked = false;
            chat_1.saySystem(client, 'House unlocked');
            client.reporter.systemLog(`House unlocked`);
        }),
        command(['removetoolbox'], '/removetoolbox - removes toolbox from the house', '', ({ world }, client) => {
            if (!isValidMapForEditing(client.map, client, false, true))
                return;
            houseMap_1.removeToolbox(world, client.map);
            chat_1.saySystem(client, 'Toolbox removed');
            client.reporter.systemLog(`Toolbox removed`);
        }),
        command(['restoretoolbox'], '/restoretoolbox - restores toolbox to the house', '', ({}, client) => {
            if (!isValidMapForEditing(client.map, client, false, true))
                return;
            houseMap_1.restoreToolbox(world, client.map);
            chat_1.saySystem(client, 'Toolbox restored');
            client.reporter.systemLog(`Toolbox restored`);
        }),
        // supporters
        command(['swap'], '/swap <name> - swap character', '', async ({ world }, client, message) => {
            if (!message) {
                return chat_1.saySystem(client, `You need to provide name of the character`);
            }
            const regex = new RegExp(`^${lodash_1.escapeRegExp(message)}$`, 'i');
            const query = { account: client.account._id, name: { $regex: regex } };
            await characterUtils_1.swapCharacter(client, world, query);
        }),
        command(['s1'], '', 'sup1', shouldNotBeCalled),
        command(['s2'], '', 'sup2', shouldNotBeCalled),
        command(['s3'], '', 'sup3', shouldNotBeCalled),
        command(['ss'], '/ss - supporter text', 'sup1', shouldNotBeCalled),
        // mod
        adminModChat(['m'], '/m - mod text', 'mod', 3 /* Mod */),
        command(['emotetest'], '/emotetest - print all emotes', 'mod', (_context, client) => {
            let text = '';
            for (let i = 0; i < emoji_1.emojis.length;) {
                if (text) {
                    text += '\n';
                }
                for (let j = 0; i < emoji_1.emojis.length && j < 20; j++, i++) {
                    text += emoji_1.emojis[i].symbol;
                }
            }
            chat_1.sayTo(client, client.pony, text, 0 /* Chat */);
        }),
        command(['goto'], '/goto <id> [<instance>]', 'mod', ({ world }, client, message) => {
            const [id = '', instance] = message.split(' ');
            const map = world.maps.find(map => map.id === id && map.instance === instance);
            if (map) {
                const { x, y } = utils_1.randomPoint(map.spawnArea);
                world.switchToMap(client, map, x, y);
            }
        }),
        command(['tp'], '/tp <location> | <x> <y> - teleport to location', 'mod', (_context, client, message) => {
            const { x, y } = getSpawnTarget(client.map, message);
            playerUtils_1.teleportTo(client, x, y);
        }),
        // admin
        adminModChat(['a'], '/a - admin text', 'admin', 2 /* Admin */),
        command(['announce'], '/announce - global announcement', 'admin', ({}, client, message, _, __, settings) => {
            serverMap_1.findEntities(client.map, e => e.type === entities_1.butterfly.type || e.type === entities_1.bat.type || e.type === entities_1.firefly.type)
                .forEach(e => chat_1.sayToAll(e, message, swears_1.filterBadWords(message), 2 /* Admin */, settings));
        }),
        command(['time'], '/time <hour> - change server time', DEVELOPMENT ? '' : 'admin', ({ world }, _client, message) => {
            if (!/^\d+$/.test(message)) {
                throw new userError_1.UserError('invalid parameter');
            }
            world.setTime(parseInt(message, 10) % 24);
        }),
        command(['togglerestore'], '/togglerestore - toggle terrain restoration', 'admin', ({ world: { options } }, client) => {
            options.restoreTerrain = !options.restoreTerrain;
            chat_1.saySystem(client, `restoration is ${options.restoreTerrain ? 'on' : 'off'}`);
        }),
        command(['resettiles'], '/resettiles - reset tiles to original state', 'admin', ({}, client) => {
            for (const region of client.map.regions) {
                serverRegion_1.resetTiles(client.map, region);
            }
        }),
        BETA && command(['season'], '/season <season> [<holiday>]', 'admin', ({ world }, _client, message) => {
            const [s = '', h = ''] = message.split(' ');
            const season = parseSeason(s);
            const holiday = parseHoliday(h);
            if (season === undefined) {
                throw new userError_1.UserError('invalid season');
            }
            else {
                world.setSeason(season, holiday === undefined ? world.holiday : holiday);
            }
        }),
        BETA && command(['weather'], '/weather <none|rain>', 'admin', ({}, client, message) => {
            const weather = parseWeather(message);
            if (weather === undefined) {
                throw new userError_1.UserError('invalid weather');
            }
            else {
                serverMap_1.updateMapState(client.map, { weather });
            }
        }),
        // superadmin
        command(['update'], '/update - prepare server for update', 'superadmin', ({ world, liveSettings }) => {
            internal_1.createNotifyUpdate(world, liveSettings)();
        }),
        command(['shutdown'], '/shutdown - shutdown server for update', 'superadmin', ({ world, liveSettings }) => {
            internal_1.createShutdownServer(world, liveSettings)(true);
        }),
        // debug
        DEVELOPMENT && command(['map'], '/map - show map info', '', ({ world }, client) => {
            const map = client.map;
            const { memory, entities } = serverMap_1.getSizeOfMap(map);
            const message = `[${map.id}:${map.instance || '-'}] ${world.maps.indexOf(map)}/${world.maps.length} ` +
                `${(memory / 1024).toFixed(2)} kb ${entities} entities`;
            chat_1.saySystem(client, message);
        }),
        command(['loadmap'], '/loadmap <file name> - load map from file', 'superadmin', ({ world }, client, message) => {
            execWithFileName(client, message, fileName => serverMap_1.loadMapFromFile(world, client.map, paths_1.pathTo('store', `${fileName}.json`), { loadOnlyTiles: true }));
        }),
        command(['savemap'], '/savemap <file name> - save map to file', 'superadmin', (_, client, message) => {
            execWithFileName(client, message, async (fileName) => {
                await serverMap_1.saveMapToFile(client.map, paths_1.pathTo('store', `${fileName}.json`), { saveTiles: true });
                // await saveMapToFileBinary(client.map, pathTo('store', `${fileName}.bin`));
            });
        }),
        command(['savemapbin'], '/savemapbin <file name> - save map to file', 'superadmin', (_, client, message) => {
            execWithFileName(client, message, fileName => serverMap_1.saveMapToFileBinaryAlt(client.map, paths_1.pathTo('store', `${fileName}.json`)));
        }),
        command(['saveentities'], '/saveentities <file name> - save entities to file', 'superadmin', (_, client, message) => {
            execWithFileName(client, message, fileName => serverMap_1.saveEntitiesToFile(client.map, paths_1.pathTo('store', `${fileName}.txt`)));
        }),
        command(['savehides'], '/savehides - save hides to file', 'superadmin', async ({ world }, client) => {
            const json = world.hidingService.serialize();
            await fs_1.writeFileAsync(paths_1.pathTo('store', 'hides.json'), json, 'utf8');
            chat_1.saySystem(client, 'saved');
        }),
        command(['throwerror'], '/throwerror <message> - throw test error', 'superadmin', (_, _client, message) => {
            throw new Error(message || 'test');
        }),
        BETA && command(['test'], '', 'superadmin', ({}, client) => {
            client.map.regions.forEach(region => {
                console.log(region.x, region.y, region.colliders.length);
            });
        }),
        BETA && command(['spamchat'], '/spamchat - spam chat messages', 'superadmin', ({ world, random }, client, _, __, ___, settings) => {
            if (interval) {
                clearInterval(interval);
                interval = undefined;
            }
            else {
                interval = setInterval(() => {
                    if (utils_1.includes(world.clients, client)) {
                        const message = lodash_1.range(random(1, 10)).map(() => stringUtils_1.randomString(random(1, 10))).join(' ');
                        chat_1.sayToEveryone(client, message, message, 0 /* Chat */, settings);
                    }
                    else {
                        clearInterval(interval);
                    }
                }, 100);
            }
        }),
        BETA && command(['noclouds'], '/noclouds - remove clouds', 'superadmin', ({ world }, client) => {
            serverMap_1.findEntities(client.map, e => e.type === entities_1.cloud.type).forEach(e => world.removeEntity(e, client.map));
        }),
        BETA && command(['msg'], '/msg - say random stuff', 'superadmin', ({}, client, _, __, ___, settings) => {
            serverMap_1.findEntities(client.map, e => !!e.options && e.name === 'debug 2')
                .forEach(e => chat_1.sayToAll(e, 'Hello there!', 'Hello there!', 0 /* Chat */, settings));
        }),
        BETA && command(['hold'], '/hold <name> - hold item', 'superadmin', ({}, client, message) => {
            playerUtils_1.holdItem(client.pony, entities_1.getEntityType(message));
        }),
        BETA && command(['toy'], '/toy <number> - hold toy', 'superadmin', ({}, client, message) => {
            playerUtils_1.holdToy(client.pony, parseInt(message, 10) | 0);
        }),
        BETA && command(['dc'], '/dc', 'superadmin', ({}, client) => {
            client.disconnect(true, false);
        }),
        BETA && command(['disconnect'], '/disconnect', 'superadmin', ({}, client) => {
            client.disconnect(true, true);
        }),
        BETA && command(['info'], '/info <id>', 'superadmin', ({ world }, client, message) => {
            const id = parseInt(message, 10) | 0;
            const entity = world.getEntityById(id);
            if (entity) {
                const { id, type, x, y, options } = entity;
                const info = { id, type: entities_1.getEntityTypeName(type), x, y, options };
                chat_1.saySystem(client, JSON.stringify(info, null, 2));
            }
            else {
                chat_1.saySystem(client, 'undefined');
            }
        }),
        BETA && command(['collider'], '/collider', 'superadmin', ({}, client) => {
            const region = worldMap_1.getRegionGlobal(client.map, client.pony.x, client.pony.y);
            if (region) {
                serverMap_1.saveRegionCollider(region);
                chat_1.saySystem(client, 'saved');
                // console.log(region.tileIndices);
            }
        }),
        DEVELOPMENT && command(['testparty'], '', 'superadmin', ({ party }, client) => {
            const entities = serverMap_1.findEntities(client.map, e => !!e.client && /^debug/.test(e.name || ''));
            for (const e of entities.slice(0, constants_1.PARTY_LIMIT - 1)) {
                party.invite(client, e.client);
            }
        }),
    ]);
    return commands;
}
exports.createCommands = createCommands;
function getSpamCommandNames(commands) {
    return utils_1.flatten(commands.filter(c => c.spam).map(c => c.names));
}
exports.getSpamCommandNames = getSpamCommandNames;
exports.createRunCommand = (context, commands) => (client, command, args, type, target, settings) => {
    command = command.toLowerCase().trim();
    const func = commands.find(c => c.names.indexOf(command) !== -1);
    try {
        if (func && hasRoleNull(client, func.role)) {
            func.handler(context, client, args, type, target, settings);
        }
        else {
            return false;
        }
    }
    catch (e) {
        if (userError_1.isUserError(e)) {
            chat_1.saySystem(client, e.message);
        }
        else {
            throw e;
        }
    }
    return true;
};
const chatTypes = new Map();
chatTypes.set('p', 1 /* Party */);
chatTypes.set('party', 1 /* Party */);
chatTypes.set('s', 0 /* Say */);
chatTypes.set('say', 0 /* Say */);
chatTypes.set('t', 2 /* Think */);
chatTypes.set('think', 2 /* Think */);
chatTypes.set('ss', 4 /* Supporter */);
chatTypes.set('s1', 5 /* Supporter1 */);
chatTypes.set('s2', 6 /* Supporter2 */);
chatTypes.set('s3', 7 /* Supporter3 */);
chatTypes.set('r', 9 /* Whisper */);
chatTypes.set('reply', 9 /* Whisper */);
chatTypes.set('w', 9 /* Whisper */);
chatTypes.set('whisper', 9 /* Whisper */);
function parseCommand(text, type) {
    if (!utils_1.isCommand(text)) {
        return { args: text, type };
    }
    const { command, args } = utils_1.processCommand(text);
    if (command) {
        const chatType = chatTypes.get(command.toLowerCase());
        if (chatType !== undefined) {
            if (chatType === 2 /* Think */) {
                type = type === 1 /* Party */ ? 3 /* PartyThink */ : 2 /* Think */;
            }
            else {
                type = chatType;
            }
            return { args, type };
        }
    }
    return { command, args, type };
}
exports.parseCommand = parseCommand;
function getChatPrefix(type) {
    switch (type) {
        case 1 /* Party */:
        case 3 /* PartyThink */:
            return '/p ';
        case 4 /* Supporter */:
            return '/ss ';
        case 8 /* Dismiss */:
            return '/dismiss ';
        case 9 /* Whisper */:
            return '/w ';
        default:
            return '';
    }
}
exports.getChatPrefix = getChatPrefix;
//# sourceMappingURL=commands.js.map