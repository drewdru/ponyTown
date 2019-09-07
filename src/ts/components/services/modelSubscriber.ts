// import { Observable } from 'rxjs';
import { SocketService } from 'ag-sockets/dist/browser';
import { ClientAdminActions } from '../../client/clientAdminActions';
import { IAdminServerActions, ModelTypes } from '../../common/adminInterfaces';
import { removeItem } from '../../common/utils';
import { Subscription } from '../../common/interfaces';
import { MINUTE } from '../../common/constants';

type OnModel<T> = (item: T | undefined) => void;

interface ModelSubscriberConfig<T> {
	fix?: (item: T) => void;
}

interface ModelSubscription<T> {
	value: T | undefined;
	timeout: any;
	callbacks: OnModel<T>[];
}

const unsubscribeTimeout = 1 * MINUTE;

export class ModelSubscriber<T> {
	private subscriptions = new Map<string, ModelSubscription<T>>();
	// private observables = new Map<string, ModelSubscription<T>>();
	constructor(
		private type: ModelTypes,
		private socket: SocketService<ClientAdminActions, IAdminServerActions>,
		private config: ModelSubscriberConfig<T> = {},
		private defaultValue: T | undefined = undefined,
	) {
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
	get(id: string) {
		const subscription = this.subscriptions.get(id);
		return subscription && subscription.value;
	}
	subscribe(id: string, callback: OnModel<T>): Subscription {
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
		} else {
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
	unsubscribe(id: string, callback: OnModel<T>) {
		const subscription = this.subscriptions.get(id);

		if (subscription) {
			removeItem(subscription.callbacks, callback);

			if (subscription.callbacks.length === 0) {
				subscription.timeout = setTimeout(() => {
					this.socket.server.unsubscribe(this.type, id);
					this.subscriptions.delete(id);
				}, unsubscribeTimeout);
			}
		}
	}
	update(id: string, update: T) {
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
