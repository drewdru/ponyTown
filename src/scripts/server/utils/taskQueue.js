"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function taskQueue() {
    const queue = [];
    let working = false;
    function next() {
        const task = queue.shift();
        if (task) {
            exec(task);
        }
        else {
            working = false;
        }
    }
    function exec({ action, resolve, reject }) {
        working = true;
        Promise.resolve()
            .then(action)
            .then(resolve, reject)
            .catch(console.error)
            .finally(next);
    }
    function push(action) {
        return new Promise((resolve, reject) => {
            const task = { action, resolve, reject };
            if (working) {
                queue.push(task);
            }
            else {
                exec(task);
            }
        });
    }
    function wait() {
        return push(lodash_1.noop);
    }
    return { push, wait };
}
exports.taskQueue = taskQueue;
function makeQueued(action) {
    const queue = taskQueue();
    return ((...args) => queue.push(() => action(...args)));
}
exports.makeQueued = makeQueued;
//# sourceMappingURL=taskQueue.js.map