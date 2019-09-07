import { sample } from 'lodash';
import {
	createBinaryWriter, getWriterBuffer, resetWriter, resizeWriter, writeArrayHeader, writeUint8Array,
	writeUint8
} from 'ag-sockets';
import { Controller, IClient } from '../serverInterfaces';
import { World } from '../world';
import { Character, Account } from '../db';
import { createClientAndPony } from '../playerUtils';
import { CounterService } from '../services/counter';
import { CharacterState, ServerConfig } from '../../common/adminInterfaces';
import { removeItem, times } from '../../common/utils';
import { timingStart, timingEnd } from '../timing';

interface Options {
	count: number;
}

const mockCharacterStates = new CounterService<CharacterState>(0);

export class FakeClientsController implements Controller {
	private clients: IClient[] = [];
	private tokens: any[] = [];
	private initialized = false;
	constructor(private world: World, private server: ServerConfig, private options: Options) {
	}
	initialize() {
		if (this.initialized)
			return;

		times(1000, async i => {
			try {
				const name = `perf-${i}`;
				const account = await Account.findOne({ name }).exec();

				if (!account)
					throw new Error(`Missing debug account (${name})`);

				const character = await Character.findOne({ account: account._id }).exec();

				if (!character)
					throw new Error(`Missing debug character (${name})`);

				this.tokens.push({ id: name, account, character });
			} catch (e) {
				console.error(e);
			}
		});

		this.initialized = true;
	}
	update() {
	}
	sparseUpdate() {
		timingStart('FakeClientController.sparseUpdate()');

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

		timingEnd();
	}
	async join() {
		try {
			const token = sample(this.tokens)!;

			if (!this.clients.some(c => c.tokenId === token.id)) {
				const client = await joinFakeClient(token, this.server, this.world);
				this.clients.push(client);
			}
		} catch (e) {
			console.error(e);
		}
	}
	async leave(client: IClient) {
		this.world.leaveClient(client);
		removeItem(this.clients, client);
	}
}

const packetWriter = createBinaryWriter();
export let lastPacket: Uint8Array | undefined;

async function joinFakeClient(token: any, server: ServerConfig, world: World): Promise<IClient> {
	const client: Partial<IClient> = {
		tokenId: token.id,
		tokenData: token,
		disconnect() {
			world.leaveClient(client as IClient);
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
					resetWriter(packetWriter);
					writeUint8(packetWriter, 123);

					if (writeArrayHeader(packetWriter, subscribes)) {
						for (let i = 0; i < subscribes.length; i++) {
							writeUint8Array(packetWriter, subscribes[i]);
						}
					}

					writeUint8Array(packetWriter, adds);

					if (writeArrayHeader(packetWriter, datas)) {
						for (let i = 0; i < datas.length; i++) {
							writeUint8Array(packetWriter, datas[i]);
						}
					}

					break;
				} catch (e) {
					if (e instanceof RangeError || /DataView/.test(e.message)) {
						resizeWriter(packetWriter);
					} else {
						throw e;
					}
				}
			} while (true);

			lastPacket = getWriterBuffer(packetWriter);
		},
		addNotification() { },
		removeNotification() { },
	};

	createClientAndPony(client as IClient, [], [], server, world, mockCharacterStates);

	world.joinClientToQueue(client as IClient);

	return client as IClient;
}
