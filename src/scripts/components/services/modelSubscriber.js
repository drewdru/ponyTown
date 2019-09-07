"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const unsubscribeTimeout = 1 * constants_1.MINUTE;
class ModelSubscriber {
    // private observables = new Map<string, ModelSubscription<T>>();
    constructor(type, socket, config = {}, defaultValue = undefined) {
        this.type = type;
        this.socket = socket;
        this.config = config;
        this.defaultValue = defaultValue;
        this.subscriptions = new Map();
    }
    // for(id: string) {
    // 	return this.createObservable(id);
    // }
    // private createObservable(id: string) {
    // 	return new Observable<T | undefined>(observer => {
    // 		this.socket.server.subscribe(this.model, id);
    // 		return () => {
    // 			this.socket.server.unsubscribe(this.model, id);
    // 		};
    // 	});
    // }
    get(id) {
        const subscription = this.subscriptions.get(id);
        return subscription && subscription.value;
    }
    subscribe(id, callback) {
        const subscription = this.subscriptions.get(id);
        if (subscription) {
            if (subscription.timeout) {
                clearTimeout(subscription.timeout);
                subscription.timeout = 0;
            }
            subscription.callbacks.push(callback);
            if (subscription.value !== undefined) {
                callback(subscription.value);
            }
        }
        else {
            this.socket.server.subscribe(this.type, id);
            this.subscriptions.set(id, {
                value: this.defaultValue,
                timeout: 0,
                callbacks: [callback],
            });
        }
        return {
            unsubscribe: () => this.unsubscribe(id, callback),
        };
    }
    unsubscribe(id, callback) {
        const subscription = this.subscriptions.get(id);
        if (subscription) {
            utils_1.removeItem(subscription.callbacks, callback);
            if (subscription.callbacks.length === 0) {
                subscription.timeout = setTimeout(() => {
                    this.socket.server.unsubscribe(this.type, id);
                    this.subscriptions.delete(id);
                }, unsubscribeTimeout);
            }
        }
    }
    update(id, update) {
        const subscription = this.subscriptions.get(id);
        if (update !== undefined && this.config.fix) {
            this.config.fix(update);
        }
        if (subscription) {
            subscription.value = update;
            subscription.callbacks.forEach(c => c(update));
        }
    }
    connected() {
        this.subscriptions.forEach((_, id) => {
            this.socket.server.subscribe(this.type, id);
        });
    }
}
exports.ModelSubscriber = ModelSubscriber;
//# sourceMappingURL=modelSubscriber.js.map