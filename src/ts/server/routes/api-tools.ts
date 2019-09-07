import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { repeat } from 'lodash';
import { randomString } from '../../common/stringUtils';
import { execAsync } from '../serverUtils';
import { offline as createOffline, handleJSON, auth } from '../requestUtils';
import * as paths from '../paths';
import { findAllCharacters, IAccount } from '../db';
import { createGetAccountCharacters } from '../api/account';
import { Settings, ServerConfig } from '../../common/adminInterfaces';
import { World } from '../world';
import { ToolsMapInfo } from '../../components/tools/tools-map/tools-map';
import { flatten } from '../../common/utils';
import { serializeMap } from '../serverMap';

export default function (server: ServerConfig, settings: Settings, world: World | undefined) {
	const offline = createOffline(settings);
	const app = Router();

	app.use(auth);

	app.get('/ponies', offline, (req, res) => {
		handleJSON(server, req, res, createGetAccountCharacters(findAllCharacters)(req.user as IAccount));
	});

	app.get('/animation/:id', offline, (req, res) => {
		const filePath = path.join(paths.store, req.params.id);

		res.sendFile(filePath);
	});

	app.post('/animation', offline, (req, res) => {
		const name = randomString(10);
		const filePath = path.join(paths.store, name);

		fs.writeFileAsync(filePath, req.body.animation, 'utf8')
			.then(() => res.send({ name }));
	});

	app.post('/animation-gif', offline, (req, res) => {
		const image: string = req.body.image;
		const width: number = req.body.width || 80;
		const height: number = req.body.height || 80;
		const fps: number = req.body.fps || 24;
		const remove: number = req.body.remove || 0;

		const name = randomString(10);
		const filePath = path.join(paths.store, name + '.png');
		const header = 'data:image/gif;base64,';
		const buffer = Buffer.from(image.substr(header.length), 'base64');
		const magick = /^win/.test(process.platform) ? 'magick' : 'convert';
		const command = `${magick} -dispose 3 -delay ${100 / fps} -loop 0 "${filePath}" -crop ${width}x${height} `
			+ `+repage${repeat(' +delete', remove)} "${filePath.replace(/png$/, 'gif')}"`;

		fs.writeFileAsync(filePath, buffer)
			.then(() => execAsync(command))
			.then(() => res.send({ name }));
	});

	app.get('/maps', offline, (_, res) => {
		if (world) {
			res.json(world.maps.map(m => m.id));
		} else {
			res.sendStatus(400);
		}
	});

	app.get('/map', offline, (req, res) => {
		if (world) {
			const id = req.query.map || '';
			const map = world.maps.find(m => m.id === id);

			if (map) {
				const mapInfo: ToolsMapInfo = {
					...serializeMap(map),
					defaultTile: map.defaultTile,
					type: map.type,
					info: {
						season: world.season,
						entities: flatten(map.regions.map(r => r.entities))
							.map(({ type, x, y, order, id }) => ({ type, x, y, order, id })),
					},
				};

				res.json(mapInfo);
				return;
			}
		}

		res.sendStatus(400);
	});

	return app;
}
