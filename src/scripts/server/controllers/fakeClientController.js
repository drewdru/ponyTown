"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const ag_sockets_1 = require("ag-sockets");
const db_1 = require("../db");
const playerUtils_1 = require("../playerUtils");
const counter_1 = require("../services/counter");
const utils_1 = require("../../common/utils");
const timing_1 = require("../timing");
const mockCharacterStates = new counter_1.CounterService(0);
class FakeClientsController {
    constructor(world, server, options) {
        this.world = world;
        this.server = server;
        this.options = options;
        this.clients = [];
        this.tokens = [];
        this.initialized = false;
    }
    initialize() {
        if (this.initialized)
            return;
        utils_1.times(1000, async (i) => {
            try {
                const name = `perf-${i}`;
                const account = await db_1.Account.findOne({ name }).exec();
                if (!account)
                    throw new Error(`Missing debug account (${name})`);
                const character = await db_1.Character.findOne({ account: account._id }).exec();
                if (!character)
                    throw new Error(`Missing debug character (${name})`);
                this.tokens.push({ id: name, account, character });
            }
            catch (e) {
                console.error(e);
            }
        });
        this.initialized = true;
    }
    update() {
    }
    sparseUpdate() {
        timing_1.timingStart('FakeClientController.sparseUpdate()');
        if (this.tokens.length) {
            for (let i = this.clients.length - 1; i >= 0; i--) {
                if (Math.random() < (10 / this.options.count)) {
                    this.leave(this.clients[i]);
                }
            }
            if (this.clients.length < this.options.count) {
                for (let i = 0; i < 10; i++) {
                    this.join();
                }
            }
        }
        timing_1.timingEnd();
    }
    async join() {
        try {
            const token = lodash_1.sample(this.tokens);
            if (!this.clients.some(c => c.tokenId === token.id)) {
                const client = await joinFakeClient(token, this.server, this.world);
                this.clients.push(client);
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    async leave(client) {
        this.world.leaveClient(client);
        utils_1.removeItem(this.clients, client);
    }
}
exports.FakeClientsController = FakeClientsController;
const packetWriter = ag_sockets_1.createBinaryWriter();
async function joinFakeClient(token, server, world) {
    const client = {
        tokenId: token.id,
        tokenData: token,
        disconnect() {
            world.leaveClient(client);
        },
        queue() { },
        left() { },
        worldState() { },
        mapState() { },
        myEntity() { },
        mapTest() { },
        updateFriends() { },
        actionParam() { },
        update(_, subscribes, adds, datas) {
            do {
                try {
                    ag_sockets_1.resetWriter(packetWriter);
                    ag_sockets_1.writeUint8(packetWriter, 123);
                    if (ag_sockets_1.writeArrayHeader(packetWriter, subscribes)) {
                        for (let i = 0; i < subscribes.length; i++) {
                            ag_sockets_1.writeUint8Array(packetWriter, subscribes[i]);
                        }
                    }
                    ag_sockets_1.writeUint8Array(packetWriter, adds);
                    if (ag_sockets_1.writeArrayHeader(packetWriter, datas)) {
                        for (let i = 0; i < datas.length; i++) {
                            ag_sockets_1.writeUint8Array(packetWriter, datas[i]);
                        }
                    }
                    break;
                }
                catch (e) {
                    if (e instanceof RangeError || /DataView/.test(e.message)) {
                        ag_sockets_1.resizeWriter(packetWriter);
                    }
                    else {
                        throw e;
                    }
                }
            } while (true);
            exports.lastPacket = ag_sockets_1.getWriterBuffer(packetWriter);
        },
        addNotification() { },
        removeNotification() { },
    };
    playerUtils_1.createClientAndPony(client, [], [], server, world, mockCharacterStates);
    world.joinClientToQueue(client);
    return client;
}
//# sourceMappingURL=fakeClientController.js.map