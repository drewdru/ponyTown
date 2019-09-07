"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const moment = require("moment");
const lodash_1 = require("lodash");
const constants_1 = require("../common/constants");
const byteSize_1 = require("./utils/byteSize");
const MB = 1024 * 1024;
const SEPARATOR = ';';
const statsHeaders = ['date', 'requests count', 'requests size', 'swearing', 'spamming'];
function encodeCSV(values) {
    return `${values.join(SEPARATOR)}\n`;
}
function getDate() {
    return (new Date()).getDate();
}
function getAverage({ bytes, mbytes }, count) {
    if (!count) {
        return '0';
    }
    else if (mbytes >= 1) {
        return `${Math.floor((mbytes / count) * MB)} b`;
    }
    else {
        return `${Math.floor(bytes / count)} b`;
    }
}
function updateHourlySocketStats(stat) {
    if (stat) {
        stat.lastHourCountBin = stat.countBin;
        stat.lastHourCountStr = stat.countStr;
        stat.lastHourSize = stat.size;
        stat.lastHourTotal = stat.size.toHumanReadable();
        stat.lastHourAverage = getAverage(stat.size, stat.countBin + stat.countStr);
        stat.lastHourOrder = stat.size.toSortableString();
        stat.countBin = 0;
        stat.countStr = 0;
        stat.size = new byteSize_1.ByteSize();
    }
}
class StatsTracker {
    constructor(statsPath) {
        this.statsPath = statsPath;
        this.stats = new Map();
        this.recvStats = [];
        this.sendStats = [];
        this.dailyDate = getDate();
        this.dailyRequestCount = 0;
        this.dailyRequestSize = new byteSize_1.ByteSize();
        this.dailySwearing = 0;
        this.dailySpamming = 0;
        this.logRequest = (req, result, url) => {
            if (result && !/^\/api-internal/.test(req.baseUrl)) {
                this.logStat(url || (req.baseUrl + req.path), typeof result === 'string' ? result.length : JSON.stringify(result).length);
            }
        };
        this.logSwearing = () => {
            this.dailySwearing++;
        };
        this.logSpamming = () => {
            this.dailySpamming++;
        };
        this.logRecvStats = (packet) => {
            this.logSocketStats(this.recvStats, packet);
        };
        this.logSendStats = (packet) => {
            this.logSocketStats(this.sendStats, packet);
        };
    }
    logSocketStats(stats, { id, name, binary, json }) {
        const entry = stats[id] || (stats[id] = {
            id,
            name,
            countStr: 0,
            countBin: 0,
            size: new byteSize_1.ByteSize(),
            lastHourCountStr: 0,
            lastHourCountBin: 0,
            lastHourTotal: '0',
            lastHourAverage: '0',
            lastHourOrder: '0',
            lastHourSize: new byteSize_1.ByteSize(),
        });
        if (!!binary) {
            entry.countBin++;
        }
        else {
            entry.countStr++;
        }
        entry.size.addBytes(binary ? (binary.length || binary.byteLength) : (json ? json.length : 0));
    }
    getStats() {
        const result = [];
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
    createActionsStats(type, stats) {
        return lodash_1.compact(stats).map(s => ({
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
    getSocketStats() {
        return {
            actions: [
                ...this.createActionsStats('recv', this.recvStats),
                ...this.createActionsStats('send', this.sendStats),
            ].sort((a, b) => b.order.localeCompare(a.order)),
        };
    }
    logStat(path, bytes) {
        const entry = this.stats.get(path);
        if (entry) {
            entry.count++;
            entry.size.addBytes(bytes);
        }
        else {
            this.stats.set(path, {
                count: 1,
                size: new byteSize_1.ByteSize(bytes),
                totalCount: 0,
                lastHourCount: 0,
                lastHourTotal: '-',
                lastHourAverage: '-',
                lastHourOrder: '',
                lastHourSize: new byteSize_1.ByteSize(),
            });
        }
    }
    submitDailyStats(statsPath) {
        const statsEntry = [
            moment().format('MMM DD'),
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
                this.dailyRequestSize = new byteSize_1.ByteSize();
            }
            this.stats.forEach(entry => {
                entry.lastHourCount = entry.count;
                entry.lastHourSize = entry.size;
                entry.lastHourTotal = entry.size.toHumanReadable();
                entry.lastHourAverage = getAverage(entry.size, entry.count);
                entry.lastHourOrder = entry.size.toSortableString();
                entry.totalCount += entry.count;
                entry.count = 0;
                entry.size = new byteSize_1.ByteSize();
                this.dailyRequestCount += entry.lastHourCount;
                this.dailyRequestSize.add(entry.lastHourSize);
            });
            this.sendStats.forEach(updateHourlySocketStats);
            this.recvStats.forEach(updateHourlySocketStats);
        }, 1 * constants_1.HOUR);
    }
}
exports.StatsTracker = StatsTracker;
//# sourceMappingURL=stats.js.map