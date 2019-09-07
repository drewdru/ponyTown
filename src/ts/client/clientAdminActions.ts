import { Method } from 'ag-sockets/dist/browser';
import { AdminModel } from '../components/services/adminModel';
import { ModelTypes } from '../common/adminInterfaces';
import { ModelSubscriber } from '../components/services/modelSubscriber';

export interface ClientUpdate {
	type: ModelTypes;
	id: string;
	update: any;
}

export class ClientAdminActions {
	constructor(private model: AdminModel) {
	}
	connected() {
		this.model.initialize(true);
		this.model.connectedToSocket();
	}
	disconnected() {
		this.model.updateTitle();
	}
	@Method()
	updates(updates: ClientUpdate[]) {
		for (const { type, id, update } of updates) {
			const model = this.model[type] as ModelSubscriber<any>;

			if (model) {
				model.update(id, update);
			} else {
				console.error(`Invalid model type "${type}"`);
			}
		}
	}
}
