"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
/* istanbul ignore next */
let StorageService = class StorageService {
    constructor() {
        this.data = undefined;
        try {
            if (typeof localStorage === 'undefined') {
                this.data = new Map();
            }
        }
        catch (_a) {
            this.data = new Map();
        }
    }
    getItem(key) {
        if (this.data) {
            return this.data.get(key);
        }
        else {
            try {
                const value = localStorage.getItem(key);
                return value == null ? undefined : value;
            }
            catch (_a) {
                return undefined;
            }
        }
    }
    setItem(key, data) {
        try {
            localStorage.setItem(key, data);
            this.data = undefined;
        }
        catch (_a) {
            if (!this.data) {
                this.data = new Map();
            }
            this.data.set(key, data);
        }
    }
    removeItem(key) {
        if (this.data) {
            this.data.delete(key);
        }
        else {
            try {
                localStorage.removeItem(key);
            }
            catch (_a) { }
        }
    }
    clear() {
        if (this.data) {
            this.data.clear();
        }
        else {
            try {
                localStorage.clear();
            }
            catch (_a) { }
        }
    }
    getJSON(key, defaultValue) {
        try {
            return JSON.parse(this.getItem(key) || '');
        }
        catch (_a) {
            return defaultValue;
        }
    }
    setJSON(key, value) {
        this.setItem(key, JSON.stringify(value));
    }
    getInt(key) {
        return parseInt(this.getItem(key) || '0', 10) | 0;
    }
    setInt(key, value) {
        this.setItem(key, value.toString(10));
    }
    getBoolean(key) {
        return this.getItem(key) === 'true';
    }
    setBoolean(key, value) {
        if (value) {
            this.setItem(key, 'true');
        }
        else {
            this.removeItem(key);
        }
    }
};
StorageService = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' }),
    tslib_1.__metadata("design:paramtypes", [])
], StorageService);
exports.StorageService = StorageService;
//# sourceMappingURL=storageService.js.map