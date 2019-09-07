import '../../lib';
import { expect } from 'chai';
import { encodeUpdateSimple, encodeRegionSimple } from '../../../common/encoders/updateEncoder';
import { EntityState, DecodedRegionUpdate, UpdateFlags, TileType } from '../../../common/interfaces';
import { entity, mockClient, serverEntity } from '../../mocks';
import { encodeString } from 'ag-sockets/dist/utf8';
import { emptyUpdate, decodeUpdate } from '../../../common/encoders/updateDecoder';
import { createServerRegion } from '../../../server/serverRegion';
import { IClient, ServerRegion } from '../../../server/serverInterfaces';
import { setEntityName } from '../../../server/entityUtils';
import { compressTiles } from '../../../common/compress';
import { REGION_SIZE } from '../../../common/constants';

describe('updateEncoder', () => {
	describe('encodeUpdate() + decodeUpdate()', () => {
		const def = { x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined };
		const out = emptyUpdate(0);
		const exp: DecodedRegionUpdate = { x: 0, y: 0, updates: [], removes: [], tiles: [], tileData: null };
		let region: ServerRegion;

		function testEncodeDecode(input: ServerRegion, expected: DecodedRegionUpdate) {
			const encoded = encodeUpdateSimple(input);
			const decoded = decodeUpdate(encoded);
			expect(decoded).eql(expected);
		}

		beforeEach(() => {
			region = createServerRegion(0, 0);
		});

		it('encodes empty updates', () => {
			testEncodeDecode(region, { ...exp });
		});

		it('encodes region x, y', () => {
			region.x = 1;
			region.y = 2;

			testEncodeDecode(region, { ...exp, x: 1, y: 2 });
		});

		it('encodes empty removes', () => {
			testEncodeDecode(region, { ...exp, removes: [] });
		});

		it('encodes removes', () => {
			region.entityRemoves.push(1, 2, 3);

			testEncodeDecode(region, { ...exp, removes: [1, 2, 3] });
		});

		it('encodes empty tiles', () => {
			testEncodeDecode(region, { ...exp, tiles: [] });
		});

		it('encodes tiles', () => {
			region.tileUpdates.push({ x: 1, y: 2, type: 3 }, { x: 7, y: 56, type: 2 });

			testEncodeDecode(region, { ...exp, tiles: [{ x: 1, y: 2, type: 3 }, { x: 7, y: 56, type: 2 }] });
		});

		it('encodes flags', () => {
			region.entityUpdates.push({ ...def, entity: { ...entity(123), state: EntityState.PonySitting }, flags: UpdateFlags.State });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, state: EntityState.PonySitting }] });
		});

		it('encodes flags with switch region', () => {
			region.entityUpdates.push({
				...def, entity: { ...entity(123), state: EntityState.PonySitting }, flags: UpdateFlags.State | UpdateFlags.SwitchRegion
			});

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, state: EntityState.PonySitting, switchRegion: true }] });
		});

		it('encodes expression', () => {
			region.entityUpdates.push({ ...def, entity: { ...entity(123), options: { expr: 555 } }, flags: UpdateFlags.Expression });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, expression: 555 }] });
		});

		it('encodes position', () => {
			region.entityUpdates.push({ ...def, entity: entity(123), flags: UpdateFlags.Position, x: 11, y: 22 });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, x: 11, y: 22, state: 0 }] });
		});

		it('encodes type', () => {
			region.entityUpdates.push({ ...def, entity: entity(123, 0, 0, 111), flags: UpdateFlags.Type });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, type: 111 }] });
		});

		it('encodes options', () => {
			region.entityUpdates.push({ ...def, entity: entity(123), flags: UpdateFlags.Options, options: { tag: 'bar' } });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, options: { tag: 'bar' } }] });
		});

		it('encodes info', () => {
			const e = serverEntity(123);
			e.encryptedInfoSafe = new Uint8Array([1, 2, 3, 4, 5]);

			region.entityUpdates.push({ ...def, entity: e, flags: UpdateFlags.Info });

			const decoded = decodeUpdate(encodeUpdateSimple(region));

			expect(Array.from(decoded.updates[0].info!)).eql([1, 2, 3, 4, 5]);
		});

		it('encodes action', () => {
			region.entityUpdates.push({ ...def, entity: entity(123), action: 5, flags: UpdateFlags.Action });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, action: 5 }] });
		});

		it('encodes name', () => {
			const e = serverEntity(123);
			e.encodedName = encodeString('foobar')!;

			region.entityUpdates.push({ ...def, entity: e, flags: UpdateFlags.Name });

			const decoded = decodeUpdate(encodeUpdateSimple(region));

			expect(decoded.updates[0].name).eql('foobar');
		});

		it('encodes bad name', () => {
			const e = serverEntity(123);
			e.encodedName = encodeString('foobar')!;
			e.nameBad = true;

			region.entityUpdates.push({ ...def, entity: e, flags: UpdateFlags.Name });

			const decoded = decodeUpdate(encodeUpdateSimple(region));

			expect(decoded.updates[0].name).eql('foobar');
			expect(decoded.updates[0].filterName).true;
		});

		it('encodes position and velocity', () => {
			region.entityUpdates.push({ ...def, entity: entity(123), flags: UpdateFlags.Position, x: 11, y: 22, vx: 1, vy: 1 });

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, x: 11, y: 22, vx: 1, vy: 1, state: 0 }] });
		});

		it('encodes position and velocity (2)', () => {
			region.entityUpdates.push({
				...def, entity: entity(123), flags: UpdateFlags.Position, x: 11.125, y: 22.5, vx: 0.125, vy: 2.5
			});

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, x: 11.125, y: 22.5, vx: 0.125, vy: 2.5, state: 0 }] });
		});

		it('encodes position and velocity (3)', () => {
			region.entityUpdates.push({
				...def, entity: entity(123), flags: UpdateFlags.Position, x: -11.125, y: -22.5, vx: -0.125, vy: -2.5
			});

			testEncodeDecode(region, { ...exp, updates: [{ ...out, id: 123, x: -11.125, y: -22.5, vx: -0.125, vy: -2.5, state: 0 }] });
		});

		it('throws on invalid velocity', () => {
			region.entityUpdates.push({ ...def, entity: entity(123), flags: UpdateFlags.Position, x: 0, y: 0, vx: 100, vy: 0 });

			expect(() => testEncodeDecode(region, { ...exp, updates: [] }))
				.throw('Exceeded max velocity (100)');
		});

		it('encodes update with all fields', () => {
			region.entityUpdates.push({
				...def, entity: { ...entity(123, 0, 0, 111), state: EntityState.PonySitting },
				flags: UpdateFlags.Position | UpdateFlags.Type | UpdateFlags.Options | UpdateFlags.Action,
				x: 11, y: 22, vx: 1, vy: 1, action: 5, options: { tag: 'bar' },
			});

			testEncodeDecode(
				region,
				{
					...exp,
					updates: [{
						...out, id: 123, type: 111, x: 11, y: 22, vx: 1, vy: 1, state: EntityState.PonySitting,
						action: 5, playerState: undefined, options: { tag: 'bar' }
					}]
				});
		});

		it('encodes multiple updates', () => {
			region.entityUpdates.push(
				{ ...def, entity: entity(123), flags: UpdateFlags.Position, x: 11, y: 22 },
				{ ...def, entity: { ...entity(321), state: EntityState.PonySitting }, flags: UpdateFlags.State }
			);

			testEncodeDecode(
				region,
				{
					...exp,
					updates: [
						{ ...out, id: 123, x: 11, y: 22, state: 0 },
						{ ...out, id: 321, state: EntityState.PonySitting },
					]
				});
		});
	});

	describe('writeRegion() + decodeUpdate()', () => {
		const tiles = new Uint8Array(REGION_SIZE * REGION_SIZE);
		tiles.fill(TileType.Dirt);
		const emptyTileData = compressTiles(tiles);

		function testEncodeDecode(region: ServerRegion, client: IClient, expected: DecodedRegionUpdate) {
			const encoded = encodeRegionSimple(region, client);
			const decoded = decodeUpdate(encoded);
			expect(decoded).eql(expected);
		}

		it('empty region', () => {
			const region = createServerRegion(1, 2);
			const client = mockClient();

			testEncodeDecode(region, client, { x: 1, y: 2, removes: [], tiles: [], tileData: emptyTileData, updates: [] });
		});

		it('encodes single entity', () => {
			const region = createServerRegion(1, 2);
			const entity = serverEntity(123, 10, 20, 32);
			const client = mockClient();
			region.entities.push(entity);

			testEncodeDecode(region, client, {
				x: 1, y: 2, removes: [], tiles: [], tileData: emptyTileData, updates: [
					{
						id: 123, x: 10, y: 20, vx: 0, vy: 0, type: 32,
						name: undefined, switchRegion: false, crc: undefined, info: undefined,
						state: 0, expression: undefined, action: undefined, options: undefined,
						playerState: undefined, filterName: false,
					},
				]
			});
		});

		it('encodes single entity with more fields', () => {
			const region = createServerRegion(1, 2);
			const entity = serverEntity(123, 10, 20, 32);
			const client = mockClient();
			region.entities.push(entity);
			setEntityName(entity, 'foo');
			const info = new Uint8Array([1, 2, 3]);
			entity.client = mockClient();
			entity.state = 123;
			entity.options = { toy: 5, expr: 123 };
			entity.encryptedInfoSafe = info;
			entity.vx = 1;
			entity.vy = 2;
			client.hides.add(entity.client.accountId);

			testEncodeDecode(region, client, {
				x: 1, y: 2, removes: [], tiles: [], tileData: emptyTileData, updates: [
					{
						id: 123, x: 10, y: 20, vx: 1, vy: 2, type: 32,
						name: 'foo', switchRegion: false, crc: 0, info,
						state: 123, expression: undefined, action: undefined, options: { toy: 5, expr: 123 },
						playerState: 2, filterName: false,
					},
				],
			});
		});

		it('skips shadowed entities', () => {
			const region = createServerRegion(1, 2);
			const entity = serverEntity(123, 10, 20, 32);
			const client = mockClient();
			region.entities.push(entity);
			entity.client = mockClient();
			entity.client.shadowed = true;

			testEncodeDecode(region, client, { x: 1, y: 2, removes: [], tiles: [], updates: [], tileData: emptyTileData });
		});
	});
});
