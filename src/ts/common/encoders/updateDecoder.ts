import {
	BinaryWriter, BinaryReader, writeInt16, readInt16, createBinaryReader, readUint16, readLength,
	readUint32, readUint8, readObject, readUint8Array
} from 'ag-sockets/dist/browser';
import { decodeString } from 'ag-sockets/dist/utf8';
import { DecodedUpdate, DecodedRegionUpdate, TileUpdate, UpdateFlags } from '../interfaces';
import { tileWidth, tileHeight, MAX_VELOCITY } from '../constants';

export function writeVelocity(writer: BinaryWriter, value: number) {
	if (value >= MAX_VELOCITY || value <= -MAX_VELOCITY) {
		throw new Error(`Exceeded max velocity (${value})`);
	}

	writeInt16(writer, (value * 0x8000) / MAX_VELOCITY);
}

export function readVelocity(reader: BinaryReader) {
	return (readInt16(reader) * MAX_VELOCITY) / 0x8000;
}

export function writeCoordX(writer: BinaryWriter, value: number) {
	writeInt16(writer, (value * tileWidth) | 0);
}

export function writeCoordY(writer: BinaryWriter, value: number) {
	writeInt16(writer, (value * tileHeight) | 0);
}

export function readCoordX(reader: BinaryReader) {
	return readInt16(reader) / tileWidth;
}

export function readCoordY(reader: BinaryReader) {
	return readInt16(reader) / tileHeight;
}

export function emptyUpdate(id: number): DecodedUpdate {
	return {
		id,
		x: undefined,
		y: undefined,
		vx: 0,
		vy: 0,
		state: undefined,
		expression: undefined,
		type: undefined,
		options: undefined,
		crc: undefined,
		name: undefined,
		filterName: false,
		info: undefined,
		action: undefined,
		switchRegion: false,
		playerState: undefined,
	};
}

export function decodeUpdate(data: Uint8Array): DecodedRegionUpdate {
	const reader = createBinaryReader(data);
	const x = readUint16(reader);
	const y = readUint16(reader);
	const updates: DecodedUpdate[] = [];
	let update: DecodedUpdate | undefined;

	while (update = readOneUpdate(reader)) {
		updates.push(update);
	}

	const removesLength = readLength(reader);
	const removes: number[] = [];

	for (let i = 0; i < removesLength; i++) {
		removes.push(readUint32(reader));
	}

	const tilesLength = readLength(reader);
	const tiles: TileUpdate[] = [];

	for (let i = 0; i < tilesLength; i++) {
		tiles.push({
			x: readUint8(reader),
			y: readUint8(reader),
			type: readUint8(reader),
		});
	}

	const tileData = readUint8Array(reader);

	return { x, y, updates, removes, tiles, tileData };
}

export function readOneUpdate(reader: BinaryReader): DecodedUpdate | undefined {
	if (reader.offset >= reader.view.byteLength)
		return undefined;

	const flags = readUint16(reader);

	if (flags === 0) {
		return undefined;
	}

	const id = readUint32(reader);
	const update = emptyUpdate(id);

	update.switchRegion = (flags & UpdateFlags.SwitchRegion) !== 0;

	if ((flags & UpdateFlags.Position) !== 0) {
		update.x = readCoordX(reader);
		update.y = readCoordY(reader);
	}

	if ((flags & UpdateFlags.Velocity) !== 0) {
		update.vx = readVelocity(reader);
		update.vy = readVelocity(reader);
	}

	if ((flags & UpdateFlags.State) !== 0) {
		update.state = readUint8(reader);
	}

	if ((flags & UpdateFlags.Expression) !== 0) {
		update.expression = readUint32(reader);
	}

	if ((flags & UpdateFlags.Type) !== 0) {
		update.type = readUint16(reader);
	}

	if ((flags & UpdateFlags.Options) !== 0) {
		update.options = readObject(reader);
	}

	if ((flags & UpdateFlags.Info) !== 0) {
		update.crc = readUint16(reader);
		update.info = readUint8Array(reader)!;
	}

	if ((flags & UpdateFlags.Action) !== 0) {
		update.action = readUint8(reader);
	}

	if ((flags & UpdateFlags.Name) !== 0) {
		update.name = decodeString(readUint8Array(reader)) || undefined;
		update.filterName = (flags & UpdateFlags.NameBad) !== 0;
	}

	if ((flags & UpdateFlags.PlayerState) !== 0) {
		update.playerState = readUint8(reader);
	}

	return update;
}
