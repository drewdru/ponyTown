"use strict";
/// <reference path="../../typings/my.d.ts" />
// Safari <= 8.4, Android
try {
    if (!('performance' in window && 'now' in performance)) {
        window.performance = Date;
    }
}
catch (_a) { }
try {
    if (!('getGamepads' in navigator)) {
        window.navigator.getGamepads = () => [];
    }
}
catch (_b) { }
try {
    if (!('requestAnimationFrame' in window)) {
        window.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 1000 / 60);
    }
}
catch (_c) { }
try {
    if (!('cancelAnimationFrame' in window)) {
        window.cancelAnimationFrame = clearTimeout;
    }
}
catch (_d) { }
// IE <= 10
try {
    if (!('devicePixelRatio' in window)) {
        window.devicePixelRatio = 1;
    }
}
catch (_e) { }
//# sourceMappingURL=polyfils.js.map