import { Injectable } from '@angular/core';
import { ClientErrorHandler, ClientOptions } from 'ag-sockets/dist/browser';
import { Person } from '../../common/rollbar';

@Injectable()
export class ErrorReporter {
	disable() {
	}
	configureUser(_person: Person) {
	}
	configureData(_data: any) {
	}
	captureEvent(_data: any) {
	}
	reportError(error: any, data?: any) {
		console.error(error, data);
	}
	createClientErrorHandler(socketOptions: ClientOptions): ClientErrorHandler {
		const handleRecvError = (error: Error, data: string | Uint8Array) => {
			if (error.message) {
				let method: string | undefined;

				if (data instanceof Uint8Array) {
					const bytes: number[] = [];
					const length = Math.min(data.length, 200);

					for (let i = 0; i < length; i++) {
						bytes.push(data[i]);
					}

					const trail = length < data.length ? '...' : '';

					if (data.length > 0) {
						const item = socketOptions.client[data[0]] as string | [string, any];
						method = typeof item === 'string' ? item : item[0];
					}

					data = `<${bytes.toString()}${trail}>`;
				}

				this.reportError(error, { data, method });
			}
		};

		return { handleRecvError };
	}
}
