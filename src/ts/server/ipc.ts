import * as ipc from 'node-ipc';

export interface LoginServer {
	hello(message: string): Promise<void>;
}

export interface GameServer {
	something(): Promise<string>;
}

interface SocketState<TServer, TClient> {
	server: TServer;
	client: TClient;
}

export function startIPCServer<TServer, TClient extends Object>(
	id: string, createServer: (client: TClient) => TServer
) {
	ipc.config.id = id;
	ipc.config.retry = 500;
	ipc.config.silent = true;
	ipc.serve(() => {
		const sockets = new Map<any, SocketState<TServer, TClient>>();

		ipc.server.on('connect', (socket) => {
			console.log('server:connect');
			const client: TClient = new Proxy<TClient>({} as any, {
				get: (_, key) => (...args: any[]) => {
					ipc.server.emit(socket, 'message', [key, args]);
				},
			});
			const server = createServer(client);
			sockets.set(socket, { server, client });
		});

		ipc.server.on('message', (data, socket) => {
			console.log('server:message', data);
			const socketState = sockets.get(socket);

			if (socketState) {
				(socketState.server as any)[data[0]](...data[1]);
			} else {
				console.error('missing server for socket');
			}
		});

		ipc.server.on('error', (error) => {
			console.log('server:error', error);
		});

		ipc.server.on('disconnect', (socket) => {
			console.log('server:disconnect');
			sockets.delete(socket);
		});

		ipc.server.on('socket.disconnected', (socket, _destroyedSocketID) => {
			console.log('server:socket.disconnected');
			sockets.delete(socket);
		});
	});

	ipc.server.start();
}

export function startIPCClient<TServer extends Object, TClient>(
	serverId: string, clientId: string, createClient: (server: TServer) => TClient
) {
	ipc.config.id = clientId;
	ipc.config.retry = 500;
	ipc.config.silent = true;
	ipc.connectTo(serverId, () => {
		let connected = false;
		const socket = ipc.of[serverId];
		const server: TServer = new Proxy<TServer>({} as any, {
			get: (_, key) => (...args: any[]) => {
				socket.emit('message', [key, args]);
			},
		});
		const client = createClient(server);

		socket.on('connect', () => {
			connected = true;
			console.log('client:connect');
		});

		socket.on('disconnect', () => {
			if (connected) {
				connected = false;
				console.log('client:disconnect');
			}
		});

		socket.on('message', (data: any) => {
			console.log('client:message', data);
			(client as any)[data[0]](...data[1]);
		});
	});
}
