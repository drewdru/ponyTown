import '../lib';
import { SinonStub, stub, assert } from 'sinon';
import { ClientErrorHandler, ClientOptions } from 'ag-sockets';
import { ErrorReporter } from '../../components/services/errorReporter';
import { times } from '../../common/utils';

describe('ErrorReporter', () => {
	describe('createClientErrorHandler()', () => {
		let socketOptions: ClientOptions;
		let errorReporter: ErrorReporter;
		let clientErrorHandler: ClientErrorHandler;
		let reportError: SinonStub<any>;

		beforeEach(() => {
			socketOptions = {} as any;
			errorReporter = new ErrorReporter();
			clientErrorHandler = errorReporter.createClientErrorHandler(socketOptions);
			reportError = stub(errorReporter, 'reportError');
		});

		it('reports error without data', () => {
			const error = new Error('foo');

			clientErrorHandler.handleRecvError(error, undefined as any);

			assert.calledWithMatch(reportError, error, { data: undefined, method: undefined });
		});

		it('sends stringified data and method from socket options', () => {
			const error = new Error('foo');
			socketOptions.client = ['bar'];

			clientErrorHandler.handleRecvError(error, new Uint8Array([0, 1, 2]));

			assert.calledWithMatch(reportError, error, { data: '<0,1,2>', method: 'bar' });
		});

		it('handles 0 length buffer', () => {
			const error = new Error('foo');
			socketOptions.client = ['bar'];

			clientErrorHandler.handleRecvError(error, new Uint8Array(0));

			assert.calledWithMatch(reportError, error, { data: '<>', method: undefined });
		});

		it('trims buffer value after 200 elements', () => {
			const error = new Error('foo');
			socketOptions.client = [['bar', {}]];

			clientErrorHandler.handleRecvError(error, new Uint8Array(300));

			assert.calledWithMatch(reportError, error, { data: `<${times(200, () => '0').join(',')}...>`, method: 'bar' });
		});

		it('does nothing if error has no message', () => {
			const error = new Error('');

			clientErrorHandler.handleRecvError(error, undefined as any);

			assert.notCalled(reportError);
		});
	});
});
