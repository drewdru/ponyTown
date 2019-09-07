import {
	Entity, DrawOptions, Camera, PaletteSpriteBatch, SpriteBatch, TileSets, Engine, Pony, WorldMap, EntityState
} from '../common/interfaces';
import { isBoundsVisible } from '../common/camera';
import { drawBounds, drawPixelText, drawBoundsOutline, drawOutlineRect, drawWorldBounds } from '../graphics/graphicsUtils';
import { ORANGE, BLUE, PURPLE, BLACK, RED, WHITE, CYAN, HOTPINK, GRAY } from '../common/colors';
import { toScreenX, toScreenY, toWorldX, toWorldY } from '../common/positionUtils';
import { tileWidth, tileHeight, PONY_TYPE, REGION_SIZE, REGION_WIDTH, REGION_HEIGHT } from '../common/constants';
import { forEachRegion, getAnyBounds, getRegion, isInWaterAt } from '../common/worldMap';
import { drawPonyEntity, drawPonyEntityLight, drawPonyEntityLightSprite } from '../common/pony';
import { getInteractBounds, sortEntities, isHidden, getSitOnBounds } from '../common/entityUtils';
import { drawTiles, drawTilesNew, drawTilesDebugInfo } from './tileUtils';
import { withAlphaFloat } from '../common/color';
import { timeStart, timeEnd } from './timing';

const SELECTED_ENTITY_BOUNDS = withAlphaFloat(ORANGE, 0.5);

function drawEntities(batch: PaletteSpriteBatch, entities: Entity[], camera: Camera, options: DrawOptions) {
	const drawHidden = options.drawHidden;
	let entitiesDrawn = 0;

	for (const entity of entities) {
		if ((!isHidden(entity) || drawHidden) && isBoundsVisible(camera, entity.bounds, entity.x, entity.y)) {
			if (entity.type === PONY_TYPE) {
				drawPonyEntity(batch, entity as Pony, options);
				entitiesDrawn++;
			} else if (entity.draw !== undefined) {
				entity.draw(batch, options);
				entitiesDrawn++;
			}
		} else {
			if (entity.type === PONY_TYPE) {
				const pony = entity as Pony;

				if (pony.batch !== undefined) {
					batch.releaseBatch(pony.batch);
					pony.batch = undefined;
				}
			}
		}
	}

	return entitiesDrawn;
}

export function drawEntityLights(batch: SpriteBatch, entities: Entity[], camera: Camera, options: DrawOptions) {
	const drawHidden = options.drawHidden;

	for (const entity of entities) {
		if (DEVELOPMENT && (entity.type !== PONY_TYPE && !entity.drawLight)) {
			console.error('Cannot draw entity light', entity);
		}

		if ((!isHidden(entity) || drawHidden) && isBoundsVisible(camera, entity.lightBounds, entity.x, entity.y)) {
			if (entity.type === PONY_TYPE) {
				drawPonyEntityLight(batch, entity as Pony, options);
			} else {
				entity.drawLight!(batch, options);
			}
		}
	}
}

export function drawEntityLightSprites(batch: SpriteBatch, entities: Entity[], camera: Camera, options: DrawOptions) {
	const drawHidden = options.drawHidden;

	for (const entity of entities) {
		if (DEVELOPMENT && (entity.type !== PONY_TYPE && !entity.drawLightSprite)) {
			console.error('Cannot draw entity light sprite', entity);
		}

		if ((!isHidden(entity) || drawHidden) && isBoundsVisible(camera, entity.lightSpriteBounds, entity.x, entity.y)) {
			if (entity.type === PONY_TYPE) {
				drawPonyEntityLightSprite(batch, entity as Pony, options);
			} else {
				entity.drawLightSprite!(batch, options);
			}
		}
	}
}

export function hasDrawLight(entity: Entity) {
	if (entity.type === PONY_TYPE) {
		const pony = entity as Pony;
		return (pony.ponyState.holding !== undefined && pony.ponyState.holding.drawLight !== undefined) ||
			((pony.state & EntityState.Magic) !== 0);
	} else {
		return entity.drawLight !== undefined;
	}
}

export function hasLightSprite(entity: Entity) {
	if (entity.type === PONY_TYPE) {
		const pony = entity as Pony;
		return (pony.ponyState.holding !== undefined && pony.ponyState.holding.drawLightSprite !== undefined);
	} else {
		return entity.drawLightSprite !== undefined;
	}
}

export function drawMap(
	batch: PaletteSpriteBatch, map: WorldMap, camera: Camera, player: Pony, options: DrawOptions,
	tileSets: TileSets, selectedEntities: Entity[],
) {
	TIMING && timeStart('forEachRegion');
	if (BETA && options.engine === Engine.Whiteness) {
		batch.drawRect(WHITE, 0, 0, toScreenX(map.width), toScreenY(map.height));
	} else if (BETA && options.engine === Engine.LayeredTiles) {
		forEachRegion(map, region => drawTilesNew(batch, region, camera, map, tileSets, options));
	} else {
		forEachRegion(map, region => drawTiles(batch, region, camera, map, tileSets, options));
	}
	TIMING && timeEnd();

	TIMING && timeStart('sortEntities');
	sortEntities(map.entitiesDrawable);
	TIMING && timeEnd();

	TIMING && timeStart('drawEntities');
	const entitiesDrawn = drawEntities(batch, map.entitiesDrawable, camera, options);
	TIMING && timeEnd();

	if (BETA || TOOLS) {
		forEachRegion(map, region => drawTilesDebugInfo(batch, region, camera, options));
	}

	if (BETA && options.debug.showHelpers) {
		drawDebugHelpers(batch, map.entities, options);
	}

	if (BETA) {
		for (const entity of selectedEntities) {
			const bounds = getAnyBounds(entity);
			drawBoundsOutline(batch, entity, bounds, SELECTED_ENTITY_BOUNDS, 2);
		}
	}

	if (BETA && options.debug.showHelpers) {
		drawOutlineRect(batch, PURPLE, getInteractBounds(player));
		drawOutlineRect(batch, 0xff000066, getSitOnBounds(player));
	}

	if (BETA && options.showColliderMap) {
		drawDebugCollider(batch, map, camera);
		batch.drawRect(PURPLE, toScreenX(player.x) - 1, toScreenY(player.y), 3, 1);
		batch.drawRect(PURPLE, toScreenX(player.x), toScreenY(player.y) - 1, 1, 3);
	}

	if (BETA && options.showHeightmap) {
		drawDebugInWater(batch, map, camera);
	}

	return entitiesDrawn;
}

// debug

function drawDebugHelpers(batch: PaletteSpriteBatch, entities: Entity[], options: DrawOptions) {
	const textColor = 0x000000b2;
	const show = options.debug;

	for (const e of entities) {
		batch.globalAlpha = 0.3;
		show.bounds && drawBounds(batch, e, e.bounds, ORANGE);
		show.cover && drawBounds(batch, e, e.coverBounds, BLUE);
		show.interact && drawBounds(batch, e, e.interactBounds, PURPLE);
		show.trigger && drawWorldBounds(batch, e, e.triggerBounds, CYAN);

		if (show.collider) {
			batch.globalAlpha = 0.5;

			const x = Math.floor(e.x * tileWidth);
			const y = Math.floor(e.y * tileHeight);

			if (e.colliders !== undefined) {
				for (const collider of e.colliders) {
					const x1 = x + collider.x;
					const x2 = x + collider.x + collider.w;
					const y1 = y + collider.y;
					const y2 = y + collider.y + collider.h;
					batch.drawRect(collider.tall ? RED : HOTPINK, x1, y1, x2 - x1, y2 - y1);
				}
			}
		}

		batch.globalAlpha = 1;
		batch.drawRect(BLACK, toScreenX(e.x), toScreenY(e.y), 1, 1); // anchor

		if (show.id) {
			drawPixelText(batch, toScreenX(e.x) + 2, toScreenY(e.y) + 2, textColor, e.id.toFixed());
		}
	}
}

function drawDebugInWater(batch: PaletteSpriteBatch, map: WorldMap, camera: Camera) {
	const color = withAlphaFloat(ORANGE, 0.4);

	forEachRegion(map, region => {
		const sx = toScreenX(region.x * REGION_SIZE);
		const sy = toScreenY(region.y * REGION_SIZE);
		const w = REGION_WIDTH;
		const h = REGION_HEIGHT;

		const cameraLeft = camera.x;
		const cameraRight = camera.x + camera.w;
		const cameraTop = camera.actualY;
		const cameraBottom = camera.actualY + camera.h;

		if (sx > cameraRight || sy > cameraBottom || (sx + w) < cameraLeft || (sy + h) < cameraTop)
			return;

		for (let y = 0; y < h; y++) {
			if ((sy + y + 1) < cameraTop || (sy + y) > cameraBottom)
				continue;

			for (let x = 0; x < w; x++) {
				if ((sx + x + 1) < cameraLeft || (sx + x) > cameraRight)
					continue;

				const tx = x;

				while (isInWaterAt(map, toWorldX(sx + x + 0.5), toWorldY(sy + y + 0.5)) && x < w) {
					x++;
				}

				if (x > tx) {
					batch.drawRect(color, sx + tx, sy + y, x - tx, 1);
				}
			}
		}
	});
}

function drawDebugCollider(batch: PaletteSpriteBatch, map: WorldMap, camera: Camera) {
	const color = withAlphaFloat(PURPLE, 0.4);

	forEachRegion(map, ({ x, y, collider }) => {
		const sx = toScreenX(x * REGION_SIZE);
		const sy = toScreenY(y * REGION_SIZE);
		const w = REGION_WIDTH;
		const h = REGION_HEIGHT;

		const cameraLeft = camera.x;
		const cameraRight = camera.x + camera.w;
		const cameraTop = camera.actualY;
		const cameraBottom = camera.actualY + camera.h;

		if (sx > cameraRight || sy > cameraBottom || (sx + w) < cameraLeft || (sy + h) < cameraTop)
			return;

		for (let y = 0; y < h; y++) {
			if ((sy + y + 1) < cameraTop || (sy + y) > cameraBottom)
				continue;

			for (let x = 0; x < w; x++) {
				if ((sx + x + 1) < cameraLeft || (sx + x) > cameraRight)
					continue;

				const tx = x;

				while (collider[x + y * w] !== 0 && x < w) {
					x++;
				}

				if (x > tx) {
					batch.drawRect(color, sx + tx, sy + y, x - tx, 1);
				}
			}
		}
	});
}

export function drawDebugRegions(batch: SpriteBatch, map: WorldMap, player: Pony, { w, h }: Camera) {
	const rw = 10;
	const rh = 8;
	const width = rw * map.regionsX;
	const height = rh * map.regionsY;
	const x = w - width - 10;
	const y = h - height - 30;

	for (let i = 0; i < map.regionsY; i++) {
		for (let j = 0; j < map.regionsX; j++) {
			if (getRegion(map, j, i)) {
				const inside = j === Math.floor(player.x / REGION_SIZE) && i === Math.floor(player.y / REGION_SIZE);
				batch.drawRect(inside ? ORANGE : RED, x + rw * j, y + rh * i, rw, rh);
			}
		}
	}

	for (let i = 0; i <= map.regionsY; i++) {
		batch.drawRect(GRAY, x, y + rh * i, width + 1, 1);
	}

	for (let i = 0; i <= map.regionsX; i++) {
		batch.drawRect(GRAY, x + rw * i, y, 1, height);
	}
}
