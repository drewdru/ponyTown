import { CounterService } from './counter';
import { IClient } from '../serverInterfaces';
import { isMutedOrShadowed, isIgnored } from '../playerUtils';

export const enum LimiterResult {
	Yes = 0,
	SameAccount = 1,
	MutedOrShadowed = 2,
	Ignored = 3,
	LimitReached = 4,
	TargetOffline = 5,
}

export class ActionLimiter {
	private counters: CounterService<void>;
	constructor(clearTimeout: number, private countLimit: number) {
		this.counters = new CounterService<void>(clearTimeout);
		this.counters.start();
	}
	canExecute(requester: IClient, target: IClient): LimiterResult {
		if (requester === target || requester.accountId === target.accountId)
			return LimiterResult.SameAccount;

		if (target.offline)
			return LimiterResult.TargetOffline;

		if (isMutedOrShadowed(requester))
			return LimiterResult.MutedOrShadowed;

		if (isIgnored(requester, target) || isIgnored(target, requester))
			return LimiterResult.Ignored;

		if (this.counters.get(requester.accountId).count >= this.countLimit)
			return LimiterResult.LimitReached;

		return LimiterResult.Yes;
	}
	count(requester: IClient) {
		return this.counters.add(requester.accountId).count;
	}
	dispose() {
		this.counters.stop();
	}
}
