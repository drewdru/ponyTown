"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ipc = require("node-ipc");
function startIPCServer(id, createServer) {
    ipc.config.id = id;
    ipc.config.retry = 500;
    ipc.config.silent = true;
    ipc.serve(() => {
        const sockets = new Map();
        ipc.server.on('connect', (socket) => {
            console.log('server:connect');
            const client = new Proxy({}, {
                get: (_, key) => (...args) => {
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
                socketState.server[data[0]](...data[1]);
            }
            else {
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
exports.startIPCServer = startIPCServer;
function startIPCClient(serverId, clientId, createClient) {
    ipc.config.id = clientId;
    ipc.config.retry = 500;
    ipc.config.silent = true;
    ipc.connectTo(serverId, () => {
        let connected = false;
        const socket = ipc.of[serverId];
        const server = new Proxy({}, {
            get: (_, key) => (...args) => {
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
        socket.on('message', (data) => {
            console.log('client:message', data);
            client[data[0]](...data[1]);
        });
    });
}
exports.startIPCClient = startIPCClient;
//# sourceMappingURL=ipc.js.map