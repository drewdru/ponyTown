"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const ag_sockets_1 = require("ag-sockets");
const logger_1 = require("../logger");
const userError_1 = require("../userError");
const utils_1 = require("../../common/utils");
const reporter_1 = require("../reporter");
const originUtils_1 = require("../originUtils");
const serverActions_1 = require("../serverActions");
const reporterIgnore = /^rate limit exceeded/i;
const ignoreErrors = [
    'String message while forced binary',
];
const rollbarIgnore = new RegExp('^(' + [
    'reserved fields must be empty',
    'rate limit exceeded',
    'transfer limit exceeded',
    'some error',
    'Invalid token',
    'Action not allowed',
    'Client does not exist',
    'Cannot perform this action on admin user',
    'Account creation is temporarily disabled',
    'Not a number',
    'Not a string',
    ...ignoreErrors,
].map(lodash_1.escapeRegExp).join('|') + ')', 'i');
let lastError = '';
let lastErrorTime = 0;
function formatMessage(message) {
    if (message === null) {
        return '<null>';
    }
    else if (message === undefined) {
        return '<undefined>';
    }
    else if (typeof message === 'string') {
        return message;
    }
    else if (message instanceof Uint8Array) {
        return `<${Array.from(message).toString()}>`;
    }
    else {
        return `<${JSON.stringify(message)}>`;
    }
}
function getPerson(client) {
    return client && client.account ? {
        id: client.accountId,
        username: client.account.name,
    } : {};
}
function reportError(rollbar, e, client, config) {
    if (userError_1.isUserError(e)) {
        userError_1.reportUserError2(e, client);
        return e;
    }
    else {
        if (client && client.reporter && !reporterIgnore.test(e.message)) {
            client.reporter.error(e);
        }
        else if (client && client.originalRequest) {
            const origin = client.originalRequest && originUtils_1.getOriginFromHTTP(client.originalRequest);
            reporter_1.create(config, undefined, undefined, origin).error(e);
        }
        else {
            reporter_1.create(config).error(e);
        }
        if (!rollbarIgnore.test(e.message)) {
            rollbar && rollbar.error(e, null, { person: getPerson(client) });
        }
        return new Error('Error occurred');
    }
}
const serverMethods = ag_sockets_1.getMethods(serverActions_1.ServerActions);
function getMethodNameFromPacket(packet) {
    try {
        if (typeof packet === 'string') {
            const values = JSON.parse(packet);
            return serverMethods[values[0]].name;
        }
        else {
            return serverMethods[packet[0]].name;
        }
    }
    catch (_a) {
        return '???';
    }
}
function reportRateLimit(client, e, message) {
    let reported = false;
    if (client.rateLimitMessage === e.message && client.rateLimitCount) {
        if (++client.rateLimitCount > 5) {
            reported = true;
            client.reporter.warn(`${e.message} (x5)`, message);
            client.rateLimitCount = 1;
            client.disconnect(true, true);
        }
    }
    else {
        client.rateLimitMessage = e.message;
        client.rateLimitCount = 1;
    }
    return reported;
}
class SocketErrorHandler {
    constructor(rollbar, config) {
        this.rollbar = rollbar;
        this.config = config;
    }
    handleError(client, e) {
        if (!/no server for given id/i.test(e.message)) {
            reportError(this.rollbar, e, client || undefined, this.config);
        }
    }
    handleRejection(client, e) {
        if (/^rate limit exceeded/i.test(e.message)) {
            reportRateLimit(client, e, 'rejection');
            return new Error('Error occurred');
        }
        else {
            return reportError(this.rollbar, e, client, this.config);
        }
    }
    handleRecvError(client, e, socketMessage) {
        if (lastError === e.message && Date.now() < (lastErrorTime + 5000))
            return;
        const message = formatMessage(socketMessage);
        const method = getMethodNameFromPacket(socketMessage);
        let reported = false;
        if (client.reporter) {
            if (/^rate limit exceeded/i.test(e.message)) {
                reported = reportRateLimit(client, e, message);
            }
            else if (/^transfer limit exceeded/i.test(e.message)) {
                reported = true;
                const desc = e.message.replace(/transfer limit exceeded /i, '');
                client.reporter.warn('Transfer limit exceeded', `${desc} - (${method}) ${message}`);
            }
            else if (!utils_1.includes(ignoreErrors, e.message)) {
                reported = true;
                client.reporter.error(e, `(${method}) ${message}`);
            }
        }
        lastError = e.message;
        lastErrorTime = Date.now();
        if (!reported && !rollbarIgnore.test(e.message || '')) {
            logger_1.logger.error(`recv error: ${e.stack || e}\n\n    message: ${message}`);
            this.rollbar && this.rollbar.error(e, null, { custom: { message }, person: getPerson(client) });
        }
    }
}
exports.SocketErrorHandler = SocketErrorHandler;
//# sourceMappingURL=socketErrorHandler.js.map