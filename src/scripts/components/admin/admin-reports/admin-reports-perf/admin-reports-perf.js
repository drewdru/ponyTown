"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
const utils_1 = require("../../../../common/utils");
const constants_1 = require("../../../../common/constants");
const frameTime = 1000 / constants_1.SERVER_FPS;
const timePadding = 10; // ms
let AdminReportsPerf = class AdminReportsPerf {
    constructor(model) {
        this.model = model;
        this.loaded = false;
        this.server = '';
        this.startTime = 0;
        this.endTime = 0;
        this.listing = [];
        this.timings = [];
        this.tooltips = [];
        this.startTimeFrom = 0;
        this.endTimeFrom = 0;
        this.frame = 0;
        this.lastZoom = 0;
        if (DEVELOPMENT) {
            const interval = setInterval(() => {
                if (utils_1.findById(this.model.state.gameServers, 'dev')) {
                    clearInterval(interval);
                    this.load('dev');
                }
            }, 100);
        }
    }
    get servers() {
        return this.model.state.gameServers.map(s => s.id);
    }
    async load(server) {
        this.server = server;
        this.timings = [];
        this.loaded = false;
        const result = await this.model.getTimings(server);
        if (result) {
            this.loaded = true;
            this.timings = result;
            this.setupZoom();
            this.recalcListing();
        }
        this.redraw();
    }
    mouseMove(e) {
        const rect = this.container.nativeElement.getBoundingClientRect();
        const x = e.pageX - rect.left;
        const y = e.pageY - rect.top;
        const tooltip = this.tooltips.find(t => utils_1.pointInRect(x, y, t));
        const element = this.tooltip.nativeElement;
        if (tooltip) {
            element.style.display = 'block';
            element.style.left = `${x + 10}px`;
            element.style.top = `${y + 10}px`;
            element.innerText = tooltip.text;
        }
        else {
            element.style.display = 'none';
        }
    }
    wheel(e) {
        e.preventDefault();
        const deltaY = utils_1.clamp(e.deltaY, -1, 1);
        const change = ((this.endTime - this.startTime) * 0.2 * deltaY);
        const rect = this.container.nativeElement.getBoundingClientRect();
        const ratioFromLeft = (e.pageX - rect.left) / rect.width;
        this.startTime = this.startTime - change * ratioFromLeft;
        this.endTime = this.endTime + change * (1 - ratioFromLeft);
        this.redraw();
    }
    setupZoom() {
        switch (this.lastZoom) {
            case 0:
            default:
                this.resetZoom();
                break;
            case 1:
                this.fitZoom();
                break;
            case 2:
                this.fullFrameZoom();
                break;
        }
    }
    resetZoom() {
        const firstTime = this.timings[0].time;
        const lastTime = this.timings[this.timings.length - 1].time;
        this.startTime = firstTime - timePadding;
        this.endTime = lastTime + timePadding;
        this.redraw();
        this.lastZoom = 0;
    }
    fitZoom() {
        const firstTime = this.timings[0].time;
        const lastTime = this.timings[this.timings.length - 1].time;
        const totalTime = lastTime - firstTime;
        this.startTime = firstTime - totalTime * 0.05;
        this.endTime = lastTime + totalTime * 0.05;
        this.redraw();
        this.lastZoom = 1;
    }
    fullFrameZoom() {
        const firstTime = this.timings[0].time;
        const lastTime = firstTime + frameTime;
        this.startTime = firstTime - 2;
        this.endTime = lastTime + 2;
        this.redraw();
        this.lastZoom = 2;
    }
    drag(e) {
        if (e.type === 'start') {
            this.startTimeFrom = this.startTime;
            this.endTimeFrom = this.endTime;
        }
        const scale = (this.endTime - this.startTime) / this.canvas.nativeElement.width;
        this.startTime = this.startTimeFrom - e.dx * scale;
        this.endTime = this.endTimeFrom - e.dx * scale;
        this.redraw();
    }
    redraw() {
        this.frame = this.frame || requestAnimationFrame(() => this.draw());
    }
    draw() {
        this.frame = 0;
        const rect = this.container.nativeElement.getBoundingClientRect();
        const canvas = this.canvas.nativeElement;
        canvas.width = rect.width;
        canvas.height = 400;
        const context = canvas.getContext('2d');
        context.fillStyle = '#222';
        context.fillRect(0, 0, canvas.width, canvas.height);
        this.tooltips.length = 0;
        if (!this.timings.length)
            return;
        const firstTime = this.timings[0].time;
        const startTime = this.startTime;
        const endTime = this.endTime;
        const totalTime = endTime - startTime;
        const timeScale = canvas.width / totalTime;
        function timeToX(time) {
            return (time - startTime) * timeScale;
        }
        function timeToXAligned(time) {
            return Math.floor(timeToX(time)) + 0.5;
        }
        context.textBaseline = 'middle';
        context.font = 'Arial 14px normal';
        // scale
        const scaleHeight = 20;
        context.strokeStyle = '#666';
        context.beginPath();
        for (let time = firstTime; time < endTime; time += frameTime) {
            context.moveTo(timeToXAligned(time), 0);
            context.lineTo(timeToXAligned(time), canvas.height);
        }
        context.stroke();
        context.strokeStyle = '#ddd';
        context.beginPath();
        context.moveTo(0, scaleHeight + 0.5);
        context.lineTo(canvas.width, scaleHeight + 0.5);
        context.stroke();
        // entries
        const rowHeight = 20;
        const startStack = [];
        for (const entry of this.timings) {
            if (entry.type === 0 /* Start */) {
                startStack.push(entry);
            }
            else {
                const start = startStack.pop();
                const name = start.name;
                const startX = timeToX(start.time);
                const endX = timeToX(entry.time);
                const y = scaleHeight + 2 + startStack.length * rowHeight;
                const w = endX - startX;
                let text = name;
                const time = entry.time - start.time;
                if (startStack.length === 0) {
                    context.fillStyle = '#efc457';
                    text = `${text} (${time.toFixed(2)} ms) ${(100 * time / frameTime).toFixed(0)}%`;
                }
                else if (/\(\)$/.test(name)) {
                    context.fillStyle = '#d4ecc6';
                }
                else {
                    context.fillStyle = '#c6dcec';
                }
                context.fillRect(startX, y, w, rowHeight - 1);
                this.tooltips.push({ x: startX, y, w, h: rowHeight, text: `${name}\n${time.toFixed(2)} ms` });
                if (w > 4) {
                    context.fillStyle = '#222';
                    context.fillText(text, startX + 4, y + rowHeight / 2);
                }
            }
        }
    }
    recalcListing() {
        this.listing = [];
        const startStack = [];
        for (const entry of this.timings) {
            if (entry.type === 0 /* Start */) {
                startStack.push(Object.assign({}, entry, { excludedTime: 0 }));
            }
            else {
                const start = startStack.pop();
                const name = start.name;
                const time = entry.time - start.time;
                let listing = this.listing.find(l => l.name === name);
                if (!listing) {
                    listing = { name, selfTime: 0, totalTime: 0, selfPercent: 0, totalPercent: 0, count: 0 };
                    this.listing.push(listing);
                }
                listing.count++;
                listing.selfTime += (time - start.excludedTime);
                listing.totalTime += time;
                if (startStack.length) {
                    startStack[startStack.length - 1].excludedTime += time;
                }
            }
        }
        const firstTime = this.timings[0].time;
        const lastTime = this.timings[this.timings.length - 1].time;
        const totalTime = lastTime - firstTime;
        for (const listing of this.listing) {
            listing.selfPercent = 100 * listing.selfTime / totalTime;
            listing.totalPercent = 100 * listing.totalTime / totalTime;
        }
        this.listing.sort((a, b) => b.selfTime - a.selfTime);
    }
};
tslib_1.__decorate([
    core_1.ViewChild('container', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], AdminReportsPerf.prototype, "container", void 0);
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], AdminReportsPerf.prototype, "canvas", void 0);
tslib_1.__decorate([
    core_1.ViewChild('tooltip', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], AdminReportsPerf.prototype, "tooltip", void 0);
AdminReportsPerf = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-reports-perf',
        templateUrl: 'admin-reports-perf.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminReportsPerf);
exports.AdminReportsPerf = AdminReportsPerf;
//# sourceMappingURL=admin-reports-perf.js.map