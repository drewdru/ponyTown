"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const sinon_1 = require("sinon");
const errorReporter_1 = require("../../components/services/errorReporter");
const utils_1 = require("../../common/utils");
describe('ErrorReporter', () => {
    describe('createClientErrorHandler()', () => {
        let socketOptions;
        let errorReporter;
        let clientErrorHandler;
        let reportError;
        beforeEach(() => {
            socketOptions = {};
            errorReporter = new errorReporter_1.ErrorReporter();
            clientErrorHandler = errorReporter.createClientErrorHandler(socketOptions);
            reportError = sinon_1.stub(errorReporter, 'reportError');
        });
        it('reports error without data', () => {
            const error = new Error('foo');
            clientErrorHandler.handleRecvError(error, undefined);
            sinon_1.assert.calledWithMatch(reportError, error, { data: undefined, method: undefined });
        });
        it('sends stringified data and method from socket options', () => {
            const error = new Error('foo');
            socketOptions.client = ['bar'];
            clientErrorHandler.handleRecvError(error, new Uint8Array([0, 1, 2]));
            sinon_1.assert.calledWithMatch(reportError, error, { data: '<0,1,2>', method: 'bar' });
        });
        it('handles 0 length buffer', () => {
            const error = new Error('foo');
            socketOptions.client = ['bar'];
            clientErrorHandler.handleRecvError(error, new Uint8Array(0));
            sinon_1.assert.calledWithMatch(reportError, error, { data: '<>', method: undefined });
        });
        it('trims buffer value after 200 elements', () => {
            const error = new Error('foo');
            socketOptions.client = [['bar', {}]];
            clientErrorHandler.handleRecvError(error, new Uint8Array(300));
            sinon_1.assert.calledWithMatch(reportError, error, { data: `<${utils_1.times(200, () => '0').join(',')}...>`, method: 'bar' });
        });
        it('does nothing if error has no message', () => {
            const error = new Error('');
            clientErrorHandler.handleRecvError(error, undefined);
            sinon_1.assert.notCalled(reportError);
        });
    });
});
//# sourceMappingURL=errorReporter.spec.js.map