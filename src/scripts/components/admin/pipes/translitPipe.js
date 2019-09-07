"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const transliteration_1 = require("transliteration");
let TranslitPipe = class TranslitPipe {
    transform(value) {
        if (!value || /^[a-z0-9-_.,\[\]!@#$%^&*{}|\/\\ ]+$/i.test(value))
            return undefined;
        const translit = transliteration_1.transliterate(value);
        return translit !== value ? translit : undefined;
    }
};
TranslitPipe = tslib_1.__decorate([
    core_1.Pipe({
        name: 'translit',
    })
], TranslitPipe);
exports.TranslitPipe = TranslitPipe;
//# sourceMappingURL=translitPipe.js.map