import * as fs from 'fs';
import * as moment from 'moment';
import { compact } from 'lodash';
import { Request } from 'express';
import { Packet } from 'ag-sockets';
import { RequestStats, ServerStats } from '../common/adminInterfaces';
import { HOUR } from '../common/constants';
import { ByteSize } from './utils/byteSize';

interface Stats {
	count: number;
	size: ByteSize;
	totalCount: number;
	lastHourCount: number;
	lastHourTotal: string;
	lastHourAverage: string;
	lastHourOrder: string;
	lastHourSize: ByteSize;
}

interface SocketStats {
	id: number;
	name: string;
	countStr: number;
	countBin: number;
	size: ByteSize;
	lastHourCountStr: number;
	lastHourCountBin: number;
	lastHourTotal: string;
	lastHourAverage: string;
	lastHourOrder: string;
	lastHourSize: ByteSize;
}

const MB = 1024 * 1024;
const SEPARATOR = ';';
const statsHeaders = ['date', 'requests count', 'requests size', 'swearing', 'spamming'];

function encodeCSV(values: any[]) {
	return `${values.join(SEPARATOR)}\n`;
}

function getDate() {
	return (new Date()).getDate();
}

function getAverage({ bytes, mbytes }: ByteSize, count: number): string {
	if (!count) {
		return '0';
	} else if (mbytes >= 1) {
		return `${Math.floor((mbytes / count) * MB)} b`;
	} else {
		return `${Math.floor(bytes / count)} b`;
	}
}

function updateHourlySocketStats(stat: SocketStats | undefined) {
	if (stat) {
		stat.lastHourCountBin = stat.countBin;
		stat.lastHourCountStr = stat.countStr;
		stat.lastHourSize = stat.size;
		stat.lastHourTotal = stat.size.toHumanReadable();
		stat.lastHourAverage = getAverage(stat.size, stat.countBin + stat.countStr);
		stat.lastHourOrder = stat.size.toSortableString();
		stat.countBin = 0;
		stat.countStr = 0;
		stat.size = new ByteSize();
	}
}

export class StatsTracker {
	private stats = new Map<string, Stats>();
	private recvStats: (SocketStats | undefined)[] = [];
	private sendStats: (SocketStats | undefined)[] = [];
	private dailyDate = getDate();
	private dailyRequestCount = 0;
	private dailyRequestSize = new ByteSize();
	private dailySwearing = 0;
	private dailySpamming = 0;
	constructor(private statsPath: string) {
	}
	logRequest = (req: Request, result: any, url?: string) => {
		if (result && !/^\/api-internal/.test(req.baseUrl)) {
			this.logStat(
				url || (req.baseUrl + req.path), typeof result === 'string' ? result.length : JSON.stringify(result).length);
		}
	}
	logSwearing = () => {
		this.dailySwearing++;
	}
	logSpamming = () => {
		this.dailySpamming++;
	}
	logRecvStats = (packet: Packet) => {
		this.logSocketStats(this.recvStats, packet);
	}
	logSendStats = (packet: Packet) => {
		this.logSocketStats(this.sendStats, packet);
	}
	private logSocketStats(stats: (SocketStats | undefined)[], { id, name, binary, json }: Packet) {
		const entry = stats[id] || (stats[id] = {
			id,
			name,
			countStr: 0,
			countBin: 0,
			size: new ByteSize(),
			lastHourCountStr: 0,
			lastHourCountBin: 0,
			lastHourTotal: '0',
			lastHourAverage: '0',
			lastHourOrder: '0',
			lastHourSize: new ByteSize(),
		});

		if (!!binary) {
			entry.countBin++;
		} else {
			entry.countStr++;
		}

		entry.size.addBytes(binary ? (binary.length || binary.byteLength) : (json ? json.length : 0));
	}
	getStats(): RequestStats[] {
		const result: RequestStats[] = [];
		this.stats.forEach(({ lastHourCount, lastHourTotal, lastHourAverage, lastHourOrder, totalCount }, path) => {
			result.push({
				path,
				totalCount,
				count: lastHourCount,
				average: lastHourAverage,
				total: lastHourTotal,
				order: lastHourOrder,
			});
		});
		return result.sort((a, b) => b.order.localeCompare(a.order));
	}
	private createActionsStats(type: string, stats: (SocketStats | undefined)[]) {
		return compact(stats).map(s => ({
			id: s.id,
			name: s.name,
			type,
			countBin: s.lastHourCountBin,
			countStr: s.lastHourCountStr,
			average: s.lastHourAverage,
			total: s.lastHourTotal,
			order: s.lastHourOrder,
		}));
	}
	getSocketStats(): ServerStats {
		return {
			actions: [
				...this.createActionsStats('recv', this.recvStats),
				...this.createActionsStats('send', this.sendStats),
			].sort((a, b) => b.order.localeCompare(a.order)),
		};
	}
	private logStat(path: string, bytes: number) {
		const entry = this.stats.get(path);

		if (entry) {
			entry.count++;
			entry.size.addBytes(bytes);
		} else {
			this.stats.set(path, {
				count: 1,
				size: new ByteSize(bytes),
				totalCount: 0,
				lastHourCount: 0,
				lastHourTotal: '-',
				lastHourAverage: '-',
				lastHourOrder: '',
				lastHourSize: new ByteSize(),
			});
		}
	}
	private submitDailyStats(statsPath: string) {
		const statsEntry = [
			moment().format('MMM DD'), // DD-MM-YY HH:mm:ss
			this.dailyRequestCount.toString(),
			this.dailyRequestSize.toString(),
			this.dailySwearing.toString(),
			this.dailySpamming.toString(),
		];

		fs.appendFileAsync(statsPath, encodeCSV(statsEntry), { encoding: 'utf8' })
			.catch(console.error)
			.done();
	}
	startStatTracking() {
		if (!fs.existsSync(this.statsPath)) {
			fs.writeFileSync(this.statsPath, encodeCSV(statsHeaders), { encoding: 'utf8' });
		}

		setInterval(() => {
			const date = getDate();

			if (date !== this.dailyDate) {
				this.submitDailyStats(this.statsPath);
				this.dailyDate = date;
				this.dailyRequestCount = 0;
				this.dailySwearing = 0;
				this.dailySpamming = 0;
				this.dailyRequestSize = new ByteSize();
			}

			this.stats.forEach(entry => {
				entry.lastHourCount = entry.count;
				entry.lastHourSize = entry.size;
				entry.lastHourTotal = entry.size.toHumanReadable();
				entry.lastHourAverage = getAverage(entry.size, entry.count);
				entry.lastHourOrder = entry.size.toSortableString();
				entry.totalCount += entry.count;
				entry.count = 0;
				entry.size = new ByteSize();

				this.dailyRequestCount += entry.lastHourCount;
				this.dailyRequestSize.add(entry.lastHourSize);
			});

			this.sendStats.forEach(updateHourlySocketStats);
			this.recvStats.forEach(updateHourlySocketStats);
		}, 1 * HOUR);
	}
}
