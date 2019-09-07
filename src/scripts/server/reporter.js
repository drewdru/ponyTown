"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const db_1 = require("./db");
const logger_1 = require("./logger");
const originUtils_1 = require("./originUtils");
const maxDescLength = 300;
/* istanbul ignore next */
const createLogEvent = (config) => (account, pony, originInfo, type, message, desc) => {
    const server = config.id;
    if (desc) {
        desc = lodash_1.truncate(desc, { length: maxDescLength });
    }
    const origin = originInfo && { ip: originInfo.ip, country: originInfo.country };
    db_1.Event.findOne({ server, account, pony, type, message, origin }).exec()
        .then(event => {
        if (event) {
            if (!event.desc || (event.desc.length < maxDescLength && desc && event.desc.indexOf(desc) === -1)) {
                event.desc = `${event.desc || ''}\n${desc || ''}`.trim();
            }
            return db_1.Event.updateOne({ _id: event._id }, { desc: event.desc, count: event.count + 1 }).exec();
        }
        else {
            return db_1.Event.create({ server, account, pony, type, message, origin, desc });
        }
    })
        .catch(logger_1.logger.error);
    return null;
};
const ignoreWarnings = ['Suspicious message', 'Spam'];
/* istanbul ignore next */
function create(server, account, pony, originInfo) {
    const logEvent = createLogEvent(server);
    const accountId = `${account}`;
    function log(type, message, desc) {
        logEvent(account, pony, originInfo, type, message, desc);
        if (DEVELOPMENT) {
            logger_1.logger.debug('[event]', `[${type}]`, message);
        }
    }
    return {
        info(message, desc) {
            log('info', message, desc);
        },
        warn(message, desc) {
            log('warning', message, desc);
            if (ignoreWarnings.indexOf(message) === -1) {
                logger_1.system(accountId, message);
            }
        },
        warnLog(message) {
            logger_1.logger.warn(message);
        },
        danger(message, desc) {
            log('danger', message, desc);
            logger_1.logger.error(message, desc || '');
        },
        error(error, desc) {
            log('danger', error.message, desc);
            logger_1.logger.error(error, desc || '');
        },
        system(message, desc, logEvent = true) {
            if (logEvent) {
                log('info', message, desc);
            }
            logger_1.system(accountId, message);
        },
        systemLog(message) {
            logger_1.system(accountId, message);
            DEVELOPMENT && logger_1.logger.log(message);
        },
        setPony(newPony) {
            pony = newPony;
        },
    };
}
exports.create = create;
/* istanbul ignore next */
function createFromRequest(server, req, pony) {
    const user = req && req.user;
    const account = user ? user.id : undefined;
    const origin = req ? originUtils_1.getOrigin(req) : undefined;
    return create(server, account, pony, origin);
}
exports.createFromRequest = createFromRequest;
//# sourceMappingURL=reporter.js.map