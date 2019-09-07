"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const taskQueue_1 = require("../../../server/utils/taskQueue");
describe('taskQueue', () => {
    let queue;
    let clock;
    beforeEach(() => {
        queue = taskQueue_1.taskQueue();
        clock = sinon_1.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
        clock = undefined;
        queue = undefined;
    });
    it('waits on empty queue', async () => {
        await queue.wait();
    });
    it('executes given action', async () => {
        const action = sinon_1.stub();
        queue.push(action);
        await queue.wait();
        sinon_1.assert.calledOnce(action);
    });
    it('executes two actions', async () => {
        const action1 = sinon_1.stub();
        const action2 = sinon_1.stub();
        queue.push(action1);
        queue.push(action2);
        await queue.wait();
        sinon_1.assert.calledOnce(action1);
        sinon_1.assert.calledOnce(action2);
    });
    it('executes actions in order', async () => {
        const order = [0];
        const action1 = sinon_1.stub().callsFake(() => order.push(1));
        const action2 = sinon_1.stub().callsFake(() => order.push(2));
        queue.push(action1);
        queue.push(action2);
        await queue.wait();
        chai_1.expect(order).eql([0, 1, 2]);
    });
    it('executes two actions with wait', async () => {
        const action1 = sinon_1.stub();
        const action2 = sinon_1.stub();
        queue.push(action1);
        await queue.wait();
        queue.push(action2);
        await queue.wait();
        sinon_1.assert.calledOnce(action1);
        sinon_1.assert.calledOnce(action2);
    });
    it('returns promise that resolves after passed action', async () => {
        const action = sinon_1.stub();
        const promise = queue.push(action);
        sinon_1.assert.notCalled(action);
        await promise.then(() => sinon_1.assert.calledOnce(action));
    });
    it('returns promise that resolves to value returned from action', async () => {
        const action = sinon_1.stub().returns('foo');
        await chai_1.expect(queue.push(action)).eventually.equal('foo');
    });
    it('returns promise that resolves to value resolved from action', async () => {
        const action = sinon_1.stub().resolves('foo');
        await chai_1.expect(queue.push(action)).eventually.equal('foo');
    });
    it('returns promise that rejects to error thrown from action', async () => {
        const action = sinon_1.stub().throws(new Error('test'));
        await chai_1.expect(queue.push(action)).rejectedWith('test');
    });
    it('returns promise that rejects to error rejected from action', async () => {
        const action = sinon_1.stub().rejects(new Error('test'));
        await chai_1.expect(queue.push(action)).rejectedWith('test');
    });
    it('returns promise that rejects to error rejected from action', async () => {
        const action = sinon_1.stub().rejects(new Error('test'));
        await chai_1.expect(queue.push(action)).rejectedWith('test');
    });
    describe('makeQueued()', () => {
        it('creates queued function', async () => {
            const action = sinon_1.stub();
            const queued = taskQueue_1.makeQueued(action);
            await queued();
            sinon_1.assert.calledOnce(action);
        });
    });
});
//# sourceMappingURL=taskQueue.spec.js.map