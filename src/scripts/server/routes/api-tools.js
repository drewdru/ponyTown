"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs = require("fs");
const path = require("path");
const lodash_1 = require("lodash");
const stringUtils_1 = require("../../common/stringUtils");
const serverUtils_1 = require("../serverUtils");
const requestUtils_1 = require("../requestUtils");
const paths = require("../paths");
const db_1 = require("../db");
const account_1 = require("../api/account");
const utils_1 = require("../../common/utils");
const serverMap_1 = require("../serverMap");
function default_1(server, settings, world) {
    const offline = requestUtils_1.offline(settings);
    const app = express_1.Router();
    app.use(requestUtils_1.auth);
    app.get('/ponies', offline, (req, res) => {
        requestUtils_1.handleJSON(server, req, res, account_1.createGetAccountCharacters(db_1.findAllCharacters)(req.user));
    });
    app.get('/animation/:id', offline, (req, res) => {
        const filePath = path.join(paths.store, req.params.id);
        res.sendFile(filePath);
    });
    app.post('/animation', offline, (req, res) => {
        const name = stringUtils_1.randomString(10);
        const filePath = path.join(paths.store, name);
        fs.writeFileAsync(filePath, req.body.animation, 'utf8')
            .then(() => res.send({ name }));
    });
    app.post('/animation-gif', offline, (req, res) => {
        const image = req.body.image;
        const width = req.body.width || 80;
        const height = req.body.height || 80;
        const fps = req.body.fps || 24;
        const remove = req.body.remove || 0;
        const name = stringUtils_1.randomString(10);
        const filePath = path.join(paths.store, name + '.png');
        const header = 'data:image/gif;base64,';
        const buffer = Buffer.from(image.substr(header.length), 'base64');
        const magick = /^win/.test(process.platform) ? 'magick' : 'convert';
        const command = `${magick} -dispose 3 -delay ${100 / fps} -loop 0 "${filePath}" -crop ${width}x${height} `
            + `+repage${lodash_1.repeat(' +delete', remove)} "${filePath.replace(/png$/, 'gif')}"`;
        fs.writeFileAsync(filePath, buffer)
            .then(() => serverUtils_1.execAsync(command))
            .then(() => res.send({ name }));
    });
    app.get('/maps', offline, (_, res) => {
        if (world) {
            res.json(world.maps.map(m => m.id));
        }
        else {
            res.sendStatus(400);
        }
    });
    app.get('/map', offline, (req, res) => {
        if (world) {
            const id = req.query.map || '';
            const map = world.maps.find(m => m.id === id);
            if (map) {
                const mapInfo = Object.assign({}, serverMap_1.serializeMap(map), { defaultTile: map.defaultTile, type: map.type, info: {
                        season: world.season,
                        entities: utils_1.flatten(map.regions.map(r => r.entities))
                            .map(({ type, x, y, order, id }) => ({ type, x, y, order, id })),
                    } });
                res.json(mapInfo);
                return;
            }
        }
        res.sendStatus(400);
    });
    return app;
}
exports.default = default_1;
//# sourceMappingURL=api-tools.js.map