"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createPool(count, createNew, reset) {
    const pool = [];
    const create = () => {
        const existing = pool.pop();
        if (existing) {
            reset(existing);
            return existing;
        }
        else {
            return createNew();
        }
    };
    const dispose = (value) => {
        if (pool.length < count) {
            pool.push(value);
            return true;
        }
        else {
            return false;
        }
    };
    return { create, dispose };
}
exports.createPool = createPool;
//# sourceMappingURL=pool.js.map