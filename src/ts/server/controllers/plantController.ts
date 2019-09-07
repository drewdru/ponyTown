import { sample, random } from 'lodash';
import { Controller, ServerEntity, ServerMap, Interact } from '../serverInterfaces';
import { World } from '../world';
import { timingStart, timingEnd } from '../timing';
import { Rect, CreateEntityMethod, ServerFlags, TileType } from '../../common/interfaces';
import { removeItem, randomPoint } from '../../common/utils';
import { getTile } from '../../common/worldMap';

interface Plant extends ServerEntity {
	plantStage: number;
	plantStageNext: number;
}

export interface PlantConfig {
	area: Rect;
	count: number;
	stages: CreateEntityMethod[][];
	onPick?: Interact;
	growOnlyOn?: TileType;
	isActive?: () => boolean;
}

export class PlantController implements Controller {
	private plants: Plant[] = [];
	private interact: Interact = (entity, client) => {
		this.world.removeEntity(entity, this.map);
		removeItem(this.plants, entity);
		this.config.onPick && this.config.onPick(entity, client);
	}
	private nextSpawn = 0;
	constructor(private world: World, private map: ServerMap, private config: PlantConfig) {
	}
	initialize() {
	}
	update() {
	}
	sparseUpdate() {
		timingStart('PlantController.sparseUpdate()');

		const now = Date.now();
		const maxStage = this.config.stages.length - 1;

		if (
			this.nextSpawn < now &&
			(this.config.isActive === undefined || this.config.isActive()) &&
			this.plants.length < this.config.count
		) {
			const { x, y } = randomPoint(this.config.area);

			if (this.config.growOnlyOn === undefined || getTile(this.map, x, y) === this.config.growOnlyOn) {
				this.addPlant(x, y, 0);
				this.nextSpawn = now + random(10000, 20000);
			}
		}

		const plantsToRemove: Plant[] = [];

		for (const plant of this.plants) {
			if (plant.plantStage < maxStage && plant.plantStageNext < now) {
				plantsToRemove.push(plant);
				this.addPlant(plant.x, plant.y, plant.plantStage + 1);
			}
		}

		for (const plant of plantsToRemove) {
			this.removePlant(plant);
		}

		timingEnd();
	}
	private removePlant(plant: Plant) {
		removeItem(this.plants, plant);
		this.world.removeEntity(plant, this.map);
	}
	private addPlant(x: number, y: number, stage: number) {
		const create = sample(this.config.stages[stage])!;
		const plant = create(x, y) as Plant;
		plant.plantStage = stage;
		plant.plantStageNext = Date.now() + random(15000, 40000);
		plant.serverFlags = ServerFlags.DoNotSave;

		if (stage === (this.config.stages.length - 1)) {
			plant.interact = this.interact;
		}

		this.plants.push(plant);
		this.world.addEntity(plant, this.map);
	}
}
