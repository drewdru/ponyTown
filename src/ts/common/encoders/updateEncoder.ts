import {
	BinaryWriter, writeUint32, writeUint16, writeUint8, writeObject, writeUint8Array, writeLength
} from 'ag-sockets/dist/browser';
import { UpdateFlags, EntityPlayerState, Action } from '../interfaces';
import { writeBinary } from '../binaryUtils';
import { ServerEntity, IClient, ServerRegion } from '../../server/serverInterfaces';
import { isEntityShadowed } from '../../server/entityUtils';
import { getRegionTiles } from '../../server/serverRegion';
import { writeCoordX, writeVelocity, writeCoordY } from './updateDecoder';
import { getPlayerState } from '../../server/playerUtils';
import { logger } from '../../server/logger';

function getOptionsOrUndefined(entity: ServerEntity) {
	return (entity.options !== undefined && Object.keys(entity.options).length > 0) ? entity.options : undefined;
}

export function writeOneUpdate(
	writer: BinaryWriter, entity: ServerEntity, flags: UpdateFlags, x: number, y: number, vx: number, vy: number,
	options: any, action: Action, playerState: EntityPlayerState
) {
	if (DEVELOPMENT && flags === 0) {
		logger.error(`Writing empty update`);
	}

	if ((flags & UpdateFlags.Position) !== 0) {
		flags |= UpdateFlags.State;

		if (vx || vy) {
			flags |= UpdateFlags.Velocity;
		}
	}

	if ((flags & UpdateFlags.Name) !== 0 && entity.nameBad === true) {
		flags |= UpdateFlags.NameBad;
	}

	writeUint16(writer, flags);
	writeUint32(writer, entity.id);

	if ((flags & UpdateFlags.Position) !== 0) {
		writeCoordX(writer, x);
		writeCoordY(writer, y);
	}

	if ((flags & UpdateFlags.Velocity) !== 0) {
		writeVelocity(writer, vx);
		writeVelocity(writer, vy);
	}

	if ((flags & UpdateFlags.State) !== 0) {
		writeUint8(writer, entity.state);
	}

	if ((flags & UpdateFlags.Expression) !== 0) {
		writeUint32(writer, entity.options!.expr!);
	}

	if ((flags & UpdateFlags.Type) !== 0) {
		writeUint16(writer, entity.type);
	}

	if ((flags & UpdateFlags.Options) !== 0) {
		writeObject(writer, options);
	}

	if ((flags & UpdateFlags.Info) !== 0) {
		writeUint16(writer, entity.crc!);
		writeUint8Array(writer, entity.encryptedInfoSafe!);
	}

	if ((flags & UpdateFlags.Action) !== 0) {
		writeUint8(writer, action!);
	}

	if ((flags & UpdateFlags.Name) !== 0) {
		writeUint8Array(writer, entity.encodedName!);
	}

	if ((flags & UpdateFlags.PlayerState) !== 0) {
		writeUint8(writer, playerState!);
	}
}

export function writeOneEntity(writer: BinaryWriter, entity: ServerEntity, client: IClient) {
	const { x, y, vx, vy } = entity;
	// TODO: const expression = !!entity.options && !!entity.options.expr; // instead of in options
	const options = getOptionsOrUndefined(entity);
	const playerState = getPlayerState(client, entity);

	let flags = UpdateFlags.Position | UpdateFlags.State | UpdateFlags.Type;

	if (entity.encryptedInfoSafe !== undefined) {
		flags |= UpdateFlags.Info;
	}

	if (entity.encodedName !== undefined) {
		flags |= UpdateFlags.Name;
	}

	if (playerState !== 0) {
		flags |= UpdateFlags.PlayerState;
	}

	if (options !== undefined) {
		flags |= UpdateFlags.Options;
	}

	writeOneUpdate(writer, entity, flags, x, y, vx, vy, options, Action.None, playerState);
}

export function writeUpdate(writer: BinaryWriter, region: ServerRegion) {
	const { x, y, entityUpdates, entityRemoves, tileUpdates } = region;

	writeUint16(writer, x);
	writeUint16(writer, y);

	for (const { entity, flags, x, y, vx, vy, options, action, playerState } of entityUpdates) {
		writeOneUpdate(writer, entity, flags, x, y, vx, vy, options, action, playerState);
	}

	writeUint16(writer, 0); // end marker

	writeLength(writer, entityRemoves.length);

	for (const remove of entityRemoves) {
		writeUint32(writer, remove);
	}

	writeLength(writer, tileUpdates.length);

	for (const { x, y, type: tile } of tileUpdates) {
		writeUint8(writer, x);
		writeUint8(writer, y);
		writeUint8(writer, tile);
	}

	writeUint8Array(writer, null); // tile data
}

export function writeRegion(writer: BinaryWriter, region: ServerRegion, client: IClient) {
	const { x, y, entities } = region;

	writeUint16(writer, x);
	writeUint16(writer, y);

	for (const entity of entities) {
		if (!isEntityShadowed(entity) || entity === client.pony) {
			writeOneEntity(writer, entity, client);
		}
	}

	writeUint16(writer, 0); // end marker

	writeLength(writer, 0); // removes
	writeLength(writer, 0); // tile updates
	writeUint8Array(writer, getRegionTiles(region)); // tile data
}

// For testing
export function encodeUpdateSimple(region: ServerRegion) {
	return writeBinary(writer => writeUpdate(writer, region));
}

// For testing
export function encodeRegionSimple(region: ServerRegion, client: IClient) {
	return writeBinary(writer => writeRegion(writer, region, client));
}
