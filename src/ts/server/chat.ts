import { repeat } from 'lodash';
import { isForbiddenMessage, createIsSuspiciousMessage } from '../common/security';
import {
	ChatType, MessageType, Action, LeaveReason, isPublicChat, isPartyChat, isPublicMessage, isPartyMessage,
	toMessageType, isWhisper, isWhisperTo
} from '../common/interfaces';
import { trimRepeatedLetters, urlRegexTexts, ipRegexText, urlExceptionRegex } from '../common/filterUtils';
import { parseExpression } from '../common/expressionUtils';
import { filterBadWords } from '../common/swears';
import { cleanMessage } from '../client/clientUtils';
import { parseCommand, getChatPrefix, RunCommand } from './commands';
import { IClient, OnSuspiciousMessage, ServerEntity, OnMessageSettings } from './serverInterfaces';
import { World } from './world';
import { setEntityExpression, isHiddenBy, isMutedOrShadowed, isIgnored, execAction } from './playerUtils';
import { Suspicious, GameServerSettings } from '../common/adminInterfaces';
import { isFriend } from './services/friends';
import { invalidEnumReturn } from '../common/utils';
import { isWorldPointWithPaddingVisible } from '../common/camera';
import { tileWidth } from '../common/constants';

function isLaugh(message: string): boolean {
	return /(^| )(ha(ha)+|he(he)+|ja(ja)+|ха(ха)+|lol|rofl)$/i.test(message);
}

function isIP(match: string): boolean {
	const parts = match.split(/\./g);
	return !parts.some(p => /^0\d+$/.test(p)) && parts.map(x => parseInt(x, 10)).every(x => x >= 0 && x <= 255);
}

function replaceIP(match: string) {
	return isIP(match) ? '[LINK]' : match;
}

const urlRegexes = urlRegexTexts.map(text => new RegExp(text, 'uig'));
const ipRegex = new RegExp(ipRegexText, 'uig');

function replaceLink(value: string) {
	return urlExceptionRegex.test(value) ? value : '[LINK]';
}

export function filterUrls(message: string): string {
	message = message.replace(ipRegex, replaceIP);

	for (const regex of urlRegexes) {
		message = message.replace(regex, replaceLink);
	}

	return message;
}

// non-party messages
function getMessageType(client: IClient, type: ChatType) {
	switch (type) {
		case ChatType.Say:
		case ChatType.Party:
			return MessageType.Chat;
		case ChatType.Supporter:
			switch (client.supporterLevel) {
				case 1: return MessageType.Supporter1;
				case 2: return MessageType.Supporter2;
				case 3: return MessageType.Supporter3;
				default: return MessageType.Chat;
			}
		case ChatType.Supporter1:
			return client.supporterLevel >= 1 ? MessageType.Supporter1 : MessageType.Chat;
		case ChatType.Supporter2:
			return client.supporterLevel >= 2 ? MessageType.Supporter2 : MessageType.Chat;
		case ChatType.Supporter3:
			return client.supporterLevel >= 3 ? MessageType.Supporter3 : MessageType.Chat;
		case ChatType.Think:
		case ChatType.PartyThink:
			return MessageType.Thinking;
		case ChatType.Dismiss:
			return MessageType.Dismiss;
		case ChatType.Whisper:
			return MessageType.Whisper;
		default:
			return invalidEnumReturn(type, MessageType.Chat);
	}
}

export type LogChat = (client: IClient, text: string, type: ChatType, ignored: boolean, target: IClient | undefined) => void;

export type IsSuspiciousMessage = ReturnType<typeof createIsSuspiciousMessage>;

export type Say = ReturnType<typeof createSay>;

export const createSay =
	(
		world: World, runCommand: RunCommand, log: LogChat, checkSpam: OnMessageSettings, reportSwears: OnMessageSettings,
		reportForbidden: OnMessageSettings, reportSuspicious: OnSuspiciousMessage, spamCommands: string[],
		random: () => number, isSuspiciousMessage: IsSuspiciousMessage,
	) =>
		(client: IClient, text: string, chatType: ChatType, target: IClient | undefined, settings: GameServerSettings) => {
			text = cleanMessage(text);

			const { command, args, type } = parseCommand(text, chatType);
			const whisper = type === ChatType.Whisper;

			if (!command && !args)
				return;

			if (whisper && client === target)
				return;

			const forbidden = command == null && isPublicChat(type) && isForbiddenMessage(args);

			log(client, text, type, forbidden, target);

			const suspicious = isSuspiciousMessage(args, settings);

			if (suspicious !== Suspicious.No) {
				reportSuspicious(client, `${getChatPrefix(type)}${text}`, suspicious);
			}

			if (command != null) {
				if (runCommand(client, command, args, type, target, settings)) {
					if (type !== ChatType.Party && spamCommands.indexOf(command) !== -1) {
						if (!client.map.instance) {
							checkSpam(client, text, settings);
						}
					}
				} else {
					const expression = parseExpression(text.substr(1));

					if (expression) {
						setEntityExpression(client.pony, expression);
					} else {
						saySystem(client, 'Invalid command');
					}
				}
			} else {
				const message = args;
				const think = type === ChatType.Think || type === ChatType.PartyThink;
				const expression = (think || whisper) ? undefined : parseExpression(message);

				if (expression) {
					setEntityExpression(client.pony, expression);
				} else if (!whisper && isLaugh(message)) {
					execAction(client, Action.Laugh, settings);
				}

				if (isPartyChat(type)) {
					sayToParty(client, message, think ? MessageType.PartyThinking : MessageType.Party);
				} else {
					const friendWhisper = whisper && target !== undefined && isFriend(client, target);
					const messageNoLinks = filterUrls(message);
					const messageCensored = forbidden ? repeat('*', messageNoLinks.length) : filterBadWords(messageNoLinks);
					const trimmedMessage = trimRepeatedLetters(messageNoLinks);
					const trimmedCensored = trimRepeatedLetters(messageCensored);
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

						world.kick(client, 'swearing', LeaveReason.Swearing);
					} else if (!friendWhisper && forbidden) {
						sayTo(client, client.pony, trimmedMessage, messageType);
					} else if (whisper) {
						sayWhisper(client, trimmedMessage, trimmedCensored, messageType, target, settings);
					} else {
						sayToEveryone(client, trimmedMessage, trimmedCensored, messageType, settings);
					}
				}
			}
		};

export function sayTo(client: IClient, { id }: ServerEntity, message: string, type: MessageType) {
	client.saysQueue.push([id, message, type]);
}

export function saySystem(client: IClient, message: string) {
	sayTo(client, client.pony, message, MessageType.System);
}

function sayToClient(
	client: IClient, entity: ServerEntity, message: string, censoredMessage: string, type: MessageType,
	settings: GameServerSettings
): boolean {
	if (client.pony !== entity && !isWhisperTo(type)) {
		const swear = !!settings.hideSwearing && message !== censoredMessage;

		if (isPublicMessage(type)) {
			if (swear) {
				return false;
			}

			if (!isWorldPointWithPaddingVisible(client.camera, entity, tileWidth * 2)) {
				return false;
			}
		}

		if (entity.client) {
			if (isIgnored(client, entity.client)) {
				return false;
			}

			if (!client.isMod && isHiddenBy(client, entity.client)) {
				return false;
			}

			if (swear && !isFriend(client, entity.client)) {
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

function sayWhisper(
	client: IClient, message: string, censoredMessage: string, type: MessageType,
	target: IClient | undefined, settings: GameServerSettings
) {
	if (target === undefined || target.shadowed || isHiddenBy(client, target)) {
		saySystem(client, `Couldn't find this player`);
	} else {
		const friend = isFriend(client, target);

		if (!friend && client.accountSettings.ignoreNonFriendWhispers) {
			saySystem(client, `You can only whisper to friends`);
		} else if (!friend && target.accountSettings.ignoreNonFriendWhispers) {
			saySystem(client, `Can't whisper to this player`);
		} else {
			sayTo(client, target.pony, message, toMessageType(type));

			if (!isMutedOrShadowed(client)) {
				sayToClient(target, client.pony, message, censoredMessage, type, settings);
			}
		}
	}
}

function sayToParty(client: IClient, message: string, type: MessageType) {
	if (!client.party) {
		saySystem(client, `you're not in a party`);
	} else if (isMutedOrShadowed(client)) {
		sayTo(client, client.pony, message, type);
	} else {
		for (const c of client.party.clients) {
			sayTo(c, client.pony, message, type);
		}
	}
}

export function sayToAll(
	entity: ServerEntity, message: string, censoredMessage: string, type: MessageType, settings: GameServerSettings
) {
	if (entity.region) {
		for (const client of entity.region.clients) {
			sayToClient(client, entity, message, censoredMessage, type, settings);
		}
	}
}

export function sayToEveryone(
	client: IClient, message: string, censoredMessage: string, type: MessageType, settings: GameServerSettings
) {
	if (
		isMutedOrShadowed(client) ||
		client.accountSettings.ignorePublicChat
	) {
		sayTo(client, client.pony, message, type);
	} else {
		sayToAll(client.pony, message, censoredMessage, type, settings);
	}
}

export function sayToOthers(
	client: IClient, message: string, type: MessageType, target: IClient | undefined, settings: GameServerSettings
) {
	if (isWhisper(type)) {
		sayWhisper(client, message, message, type, target, settings);
	} else if (isPartyMessage(type)) {
		sayToParty(client, message, type);
	} else {
		sayToEveryone(client, message, message, type, settings);
	}
}

export const sayToClientTest = sayToClient;
export const sayToPartyTest = sayToParty;
export const sayWhisperTest = sayWhisper;
