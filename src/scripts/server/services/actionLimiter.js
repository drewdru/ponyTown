"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const counter_1 = require("./counter");
const playerUtils_1 = require("../playerUtils");
var LimiterResult;
(function (LimiterResult) {
    LimiterResult[LimiterResult["Yes"] = 0] = "Yes";
    LimiterResult[LimiterResult["SameAccount"] = 1] = "SameAccount";
    LimiterResult[LimiterResult["MutedOrShadowed"] = 2] = "MutedOrShadowed";
    LimiterResult[LimiterResult["Ignored"] = 3] = "Ignored";
    LimiterResult[LimiterResult["LimitReached"] = 4] = "LimitReached";
    LimiterResult[LimiterResult["TargetOffline"] = 5] = "TargetOffline";
})(LimiterResult = exports.LimiterResult || (exports.LimiterResult = {}));
class ActionLimiter {
    constructor(clearTimeout, countLimit) {
        this.countLimit = countLimit;
        this.counters = new counter_1.CounterService(clearTimeout);
        this.counters.start();
    }
    canExecute(requester, target) {
        if (requester === target || requester.accountId === target.accountId)
            return 1 /* SameAccount */;
        if (target.offline)
            return 5 /* TargetOffline */;
        if (playerUtils_1.isMutedOrShadowed(requester))
            return 2 /* MutedOrShadowed */;
        if (playerUtils_1.isIgnored(requester, target) || playerUtils_1.isIgnored(target, requester))
            return 3 /* Ignored */;
        if (this.counters.get(requester.accountId).count >= this.countLimit)
            return 4 /* LimitReached */;
        return 0 /* Yes */;
    }
    count(requester) {
        return this.counters.add(requester.accountId).count;
    }
    dispose() {
        this.counters.stop();
    }
}
exports.ActionLimiter = ActionLimiter;
//# sourceMappingURL=actionLimiter.js.map