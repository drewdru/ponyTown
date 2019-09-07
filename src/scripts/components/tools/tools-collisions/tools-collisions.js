"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const positionUtils_1 = require("../../../common/positionUtils");
const utils_1 = require("../../../common/utils");
const canvasUtils_1 = require("../../../client/canvasUtils");
const pixelSize = 10;
const tileWidth = 32 * pixelSize;
const tileHeight = 24 * pixelSize;
function toWorldX(x) {
    return x / tileWidth;
}
function toWorldY(y) {
    return y / tileHeight;
}
function toWorld(pt) {
    return { x: toWorldX(pt.x), y: toWorldY(pt.y) };
}
function toScreenX(x) {
    return x * tileWidth;
}
function toScreenY(y) {
    return y * tileHeight;
}
function toScreen(pt) {
    return { x: toScreenX(pt.x), y: toScreenY(pt.y) };
}
let ToolsCollisions = class ToolsCollisions {
    constructor() {
        this.start = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.steps = [];
        this.deflection = { x: 0, y: 0 };
        this.collided = false;
        this.rects = [
            { x: 1, y: 1, w: 1, h: 1 },
            { x: 3, y: 1.5, w: 0.5, h: 1 },
            { x: 3.5, y: 1.5, w: 0.5, h: 1.5 },
            { x: 2, y: 4, w: 2, h: 1 },
            { x: 3.5, y: 3.5, w: 1, h: 1 },
        ];
        this.collider = new Uint8Array(6 * 32 * 6 * 24);
    }
    ngOnInit() {
        const line = 6 * 32;
        for (const r of this.rects) {
            const x0 = Math.floor(r.x * 32);
            const y0 = Math.floor(r.y * 24);
            const x1 = x0 + Math.floor(r.w * 32);
            const y1 = y0 + Math.floor(r.h * 24);
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    this.collider[x + y * line] = 1;
                }
            }
        }
        for (let y = 60, x0 = 40; y < 70; y++, x0++) {
            for (let x = x0; x < 60; x++) {
                this.collider[x + y * line] = 1;
            }
        }
        for (let y = 70, x0 = 80; y < 80; y++, x0--) {
            for (let x = x0; x < (x0 + 20); x++) {
                this.collider[x + y * line] = 1;
            }
        }
        for (let y = 10, x0 = 80; y < 20; y++, x0 -= 2) {
            for (let x = x0; x < (x0 + 20); x++) {
                this.collider[x + y * line] = 1;
            }
        }
        this.colliderCanvas = canvasUtils_1.createCanvas(6 * 32, 6 * 24);
        const context = this.colliderCanvas.getContext('2d');
        const data = context.getImageData(0, 0, this.colliderCanvas.width, this.colliderCanvas.height);
        for (let i = 0; i < this.collider.length; i++) {
            if (this.collider[i] !== 0) {
                data.data[i * 4 + 0] = 255;
                data.data[i * 4 + 1] = 255;
                data.data[i * 4 + 2] = 0;
                data.data[i * 4 + 3] = 255;
            }
        }
        context.putImageData(data, 0, 0);
        this.draw();
    }
    drag({ type, x, y, dx, dy, event: { shiftKey } }) {
        if (type === 'start') {
            this.start = toWorld({ x, y });
        }
        if (shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.target = toWorld({ x, y: toScreenY(this.start.y) });
            }
            else {
                this.target = toWorld({ x: toScreenX(this.start.x), y });
            }
        }
        else {
            this.target = toWorld({ x, y });
        }
        this.draw();
    }
    draw() {
        if (true) {
            // roundPosition(this.start);
            // roundPosition(this.target);
            this.steps = [];
            this.collided = false;
            let steps = 100;
            const current = utils_1.point(this.start.x, this.start.y);
            while (--steps > 0) {
                const collision = utils_1.point(0, 0);
                if (isColliding(current.x, current.y, this.target.x, this.target.y, this.rects, collision)) {
                    this.collided = true;
                    this.steps.push(collision);
                    current.x = collision.x;
                    current.y = collision.y;
                }
                else {
                    this.steps.push(utils_1.point(this.target.x, this.target.y));
                }
                break;
            }
            if (steps <= 0) {
                console.error('Failed');
            }
        }
        else {
            const collision = getClosestCollisionOld(this.start, this.target, this.rects);
            if (equal(this.target, collision)) {
                this.deflection = Object.assign({}, this.target);
            }
            else {
                const coll = getClosestCollisionOld(collision, this.target, this.rects);
                if (equal(collision, coll)) {
                    const horizontal = getClosestCollisionOld(collision, { x: this.target.x, y: collision.y }, this.rects);
                    const vertical = getClosestCollisionOld(collision, { x: collision.x, y: this.target.y }, this.rects);
                    this.deflection = equal(collision, horizontal) ? vertical : horizontal;
                }
                else {
                    console.log('not', collision, coll);
                }
            }
        }
        const checkedTiles = new Set();
        // plot
        {
            let srcX = this.start.x;
            let srcY = this.start.y;
            let dstX = this.target.x;
            let dstY = this.target.y;
            if (srcX > dstX) {
                const tx = srcX;
                const ty = srcY;
                srcX = dstX;
                srcY = dstY;
                dstX = tx;
                dstY = ty;
            }
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.floor(dstX);
            const y1 = Math.floor(dstY);
            let steps = 100;
            let x = x0;
            let y = y0;
            const DYbyDX = (dstY - srcY) / (dstX - srcX);
            checkedTiles.add(`${x}-${y}`);
            if (srcY < dstY) {
                while (--steps && (x !== x1 || y !== y1)) {
                    const dx = (x + 1) - srcX;
                    const dy = dx * DYbyDX;
                    const ay = srcY + dy;
                    if (ay < (y + 1)) {
                        x++;
                    }
                    else {
                        y++;
                    }
                    checkedTiles.add(`${x}-${y}`);
                }
            }
            else {
                while (--steps && (x !== x1 || y !== y1)) {
                    const dx = (x + 1) - srcX;
                    const dy = dx * DYbyDX;
                    const ay = srcY + dy;
                    if (ay >= y) {
                        x++;
                    }
                    else {
                        y--;
                    }
                    checkedTiles.add(`${x}-${y}`);
                }
            }
        }
        // end
        const result = checkInLine(this.start.x * 32, this.start.y * 24, this.target.x * 32, this.target.y * 24, this.collider);
        const canvas = this.canvas.nativeElement;
        const context = canvas.getContext('2d');
        context.fillStyle = '#444';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const xs = Math.ceil(canvas.width / tileWidth);
        const ys = Math.ceil(canvas.height / tileHeight);
        context.save();
        context.fillStyle = '#533';
        context.globalAlpha = 0.5;
        for (let y = 0; y < ys; y++) {
            for (let x = 0; x < xs; x++) {
                if (checkedTiles.has(`${x}-${y}`)) {
                    context.fillRect(x * tileWidth, y * tileHeight, tileWidth - 1, tileHeight - 1);
                }
            }
        }
        context.restore();
        context.save();
        context.scale(pixelSize, pixelSize);
        context.globalAlpha = 0.2;
        canvasUtils_1.disableImageSmoothing(context);
        context.drawImage(this.colliderCanvas, 0, 0);
        context.restore();
        context.save();
        context.strokeStyle = 'white';
        context.globalAlpha = 0.05;
        context.beginPath();
        for (let y = 0; y < canvas.height; y += pixelSize) {
            context.moveTo(0, round5(y));
            context.lineTo(canvas.width, round5(y));
        }
        for (let x = 0; x < canvas.width; x += pixelSize) {
            context.moveTo(round5(x), 0);
            context.lineTo(round5(x), canvas.height);
        }
        context.stroke();
        context.restore();
        context.save();
        context.strokeStyle = 'white';
        context.globalAlpha = 0.15;
        context.beginPath();
        for (let y = 0; y < canvas.height; y += tileHeight) {
            context.moveTo(0, round5(y));
            context.lineTo(canvas.width, round5(y));
        }
        for (let x = 0; x < canvas.width; x += tileWidth) {
            context.moveTo(round5(x), 0);
            context.lineTo(round5(x), canvas.height);
        }
        context.stroke();
        context.restore();
        context.save();
        context.fillStyle = 'lime';
        context.globalAlpha = 0.2;
        let collided = false;
        for (const pt of result.checks) {
            const colliding = isCollidingWithRect(pt.x, pt.y, this.rects);
            context.fillStyle = pt.type === 'break' ? 'blue' : 'lime'; // colliding ? 'red' : (collided ? 'orange' : 'lime');
            collided = collided || colliding;
            context.fillRect(pt.x * pixelSize, pt.y * pixelSize, pixelSize, pixelSize);
        }
        context.restore();
        // context.save();
        // context.strokeStyle = 'orange';
        // context.setLineDash([3, 3]);
        // for (const rect of this.rects) {
        // 	context.strokeRect(
        // 		round5(toScreenX(rect.x)), round5(toScreenY(rect.y)),
        // 		Math.round(toScreenX(rect.w)), Math.round(toScreenY(rect.h)));
        // }
        // context.restore();
        drawLine(context, toScreen(this.start), toScreen(this.target), 'gray', true);
        let last = this.start;
        this.steps = [utils_1.point(result.result.x / 32, result.result.y / 24)];
        for (const c of this.steps) {
            drawLine(context, toScreen(last), toScreen(c), 'lime', true);
            last = c;
        }
        drawPoint(context, toScreen(this.start), 'greenyellow');
        drawPoint(context, toScreen(this.target), 'red');
        for (const c of this.steps) {
            const colliding = isColliding(c.x, c.y, c.x, c.y, this.rects, utils_1.point(0, 0));
            drawPoint(context, toScreen(c), colliding ? 'red' : 'yellow');
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsCollisions.prototype, "canvas", void 0);
ToolsCollisions = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-collisions',
        templateUrl: 'tools-collisions.pug',
    })
], ToolsCollisions);
exports.ToolsCollisions = ToolsCollisions;
function drawLine(context, a, b, color, arrow = false) {
    context.save();
    context.strokeStyle = color;
    // context.lineWidth = 2;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    context.restore();
    if (arrow && (a.x !== b.x || a.y !== b.y)) {
        const scale = 0.5;
        context.save();
        context.fillStyle = color;
        context.translate(b.x, b.y);
        context.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-12 * scale, -6 * scale);
        context.lineTo(-12 * scale, 6 * scale);
        context.closePath();
        context.fill();
        context.restore();
    }
}
function drawPoint(context, { x, y }, color) {
    context.save();
    context.shadowColor = 'black';
    context.shadowBlur = 3;
    context.fillStyle = color;
    context.globalAlpha = 0.5;
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
function round5(x) {
    return Math.ceil(x) - 0.5;
}
function equal(a, b) {
    return a.x === b.x && a.y === b.y;
}
function isColliding(srcX, srcY, dstX, dstY, rects, collision) {
    const temp = utils_1.point(0, 0);
    let collided = false;
    collision.x = dstX;
    collision.y = dstY;
    for (const r of rects) {
        if (getCollision(srcX, srcY, dstX, dstY, r.x, r.y, r.x + r.w, r.y + r.h, temp)) {
            if (!collided || (utils_1.distanceSquaredXY(srcX, srcY, temp.x, temp.y) < utils_1.distanceSquaredXY(srcX, srcY, collision.x, collision.y))) {
                collision.x = temp.x;
                collision.y = temp.y;
                collided = true;
            }
        }
    }
    positionUtils_1.roundPosition(collision);
    return collided;
}
function getClosestCollisionOld(a, b, rects) {
    return rects.reduce((pt, r) => getCollisionTest(a, pt, r) || pt, Object.assign({}, b));
}
function getCollisionTest({ x, y }, b, r) {
    const vx = b.x - x;
    const vy = b.y - y;
    const p = [-vx, vx, -vy, vy];
    const q = [x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y];
    let u1 = -999999;
    let u2 = 999999;
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) {
                return undefined;
            }
        }
        else {
            const t = q[i] / p[i];
            if (p[i] < 0 && u1 < t) {
                u1 = t;
            }
            else if (p[i] > 0 && u2 > t) {
                u2 = t;
            }
        }
    }
    if (u1 > u2 || u1 > 1 || u1 < 0) {
        return undefined;
    }
    return {
        x: x + u1 * vx,
        y: y + u1 * vy,
    };
}
function isCollidingWithRect(x, y, rects) {
    for (const r of rects) {
        const x0 = Math.floor(r.x * 32) | 0;
        const y0 = Math.floor(r.y * 24) | 0;
        const x1 = Math.ceil((r.x + r.w) * 32) | 0;
        const y1 = Math.ceil((r.y + r.h) * 24) | 0;
        if (x >= x0 && x < x1 && y >= y0 && y < y1) {
            return true;
        }
    }
    return false;
}
function checkInLine(srcX, srcY, dstX, dstY, collider) {
    function isColliding(x, y) {
        return x < 0 || y < 0 || x >= (6 * 32) || y >= (6 * 32) || collider[x + y * (6 * 32)] !== 0;
    }
    const checks = [];
    const result = utils_1.point(srcX, srcY);
    const x0 = Math.floor(srcX) | 0;
    const y0 = Math.floor(srcY) | 0;
    const x1 = Math.floor(dstX) | 0;
    const y1 = Math.floor(dstY) | 0;
    let minX = Math.min(x0, x1) | 0;
    let maxX = Math.max(x0, x1) | 0;
    let minY = Math.min(y0, y1) | 0;
    let maxY = Math.max(y0, y1) | 0;
    let x = x0 | 0;
    let y = y0 | 0;
    checks.push({ x, y });
    let actualX = x | 0;
    let actualY = y | 0;
    const a = (dstY - srcY) / (dstX - srcX);
    const b = srcY - a * srcX;
    const useGt = srcY < dstY;
    let stepXT = 0 | 0, stepYT = 0 | 0;
    let stepXF = 0 | 0, stepYF = 0 | 0;
    let ox = 0, oy = 0;
    const shiftRight = srcX <= dstX;
    const shiftLeft = srcX >= dstX;
    const shiftUp = srcY >= dstY;
    const shiftDown = srcY <= dstY;
    const horizontalOrVertical = srcX === dstX || srcY === dstY;
    if (srcX < dstX) {
        if (srcY < dstY) {
            ox = 1;
            oy = 1;
            stepYT = 1 | 0;
            stepXF = 1 | 0;
        }
        else {
            ox = 1;
            stepYT = -1 | 0;
            stepXF = 1 | 0;
        }
    }
    else if (srcX > dstX) {
        if (srcY < dstY) {
            oy = 1;
            stepYT = 1 | 0;
            stepXF = -1 | 0;
        }
        else {
            stepYT = -1 | 0;
            stepXF = -1 | 0;
        }
    }
    else {
        if (srcY < dstY) {
            stepYF = stepYT = 1 | 0;
        }
        else {
            stepYF = stepYT = -1 | 0;
        }
    }
    for (let steps = 1000; steps; steps--) {
        const fx = a * (x + ox) + b;
        const fy = y + oy;
        let tx = 0 | 0;
        let ty = 0 | 0;
        if (useGt ? (fx > fy) : (fx < fy)) {
            tx = (tx + stepXT) | 0;
            ty = (ty + stepYT) | 0;
        }
        else {
            tx = (tx + stepXF) | 0;
            ty = (ty + stepYF) | 0;
        }
        x = (x + tx) | 0;
        y = (y + ty) | 0;
        if (x < minX || x > maxX || y < minY || y > maxY) {
            break;
        }
        let actualNX = (actualX + tx) | 0;
        let actualNY = (actualY + ty) | 0;
        let collides = isColliding(actualNX, actualNY);
        let canMove = false;
        if (collides) {
            if (tx !== 0) {
                let canShiftUp = false;
                let canShiftDown = false;
                if (shiftUp && (canShiftUp = !isColliding(actualX, actualY - 1)) && !isColliding(actualNX, actualY - 1)) {
                    actualNX = actualX;
                    actualNY -= 1;
                    dstY -= 1;
                    collides = false;
                }
                else if (shiftDown && (canShiftDown = !isColliding(actualX, actualY + 1)) && !isColliding(actualNX, actualY + 1)) {
                    actualNX = actualX;
                    actualNY += 1;
                    dstY += 1;
                    collides = false;
                }
                else if (shiftUp && canShiftUp && !isColliding(actualNX, actualY - 2)) {
                    actualNX = actualX;
                    actualNY -= 1;
                    dstY -= 1;
                    collides = false;
                }
                else if (shiftDown && canShiftDown && !isColliding(actualNX, actualY + 2)) {
                    actualNX = actualX;
                    actualNY += 1;
                    dstY += 1;
                    collides = false;
                }
                canMove = canShiftUp || canShiftDown;
            }
            else {
                let canShiftLeft = false;
                let canShiftRight = false;
                if (shiftLeft && (canShiftLeft = !isColliding(actualX - 1, actualY)) && !isColliding(actualX - 1, actualNY)) {
                    actualNX -= 1;
                    actualNY = actualY;
                    dstX -= 1;
                    collides = false;
                }
                else if (shiftRight && (canShiftRight = !isColliding(actualX + 1, actualY)) && !isColliding(actualX + 1, actualNY)) {
                    actualNX += 1;
                    actualNY = actualY;
                    dstX += 1;
                    collides = false;
                }
                else if (shiftLeft && canShiftLeft && !isColliding(actualX - 2, actualNY)) {
                    actualNX -= 1;
                    actualNY = actualY;
                    dstX -= 1;
                    collides = false;
                }
                else if (shiftRight && canShiftRight && !isColliding(actualX + 2, actualNY)) {
                    actualNX += 1;
                    actualNY = actualY;
                    dstX += 1;
                    collides = false;
                }
                canMove = canShiftLeft || canShiftRight;
            }
        }
        if (!collides) {
            actualX = actualNX;
            actualY = actualNY;
            checks.push({ x: actualX, y: actualY });
        }
        else if (!canMove || horizontalOrVertical) {
            checks.push({ x: actualX, y: actualY, type: 'break' });
            break;
        }
    }
    const epsilon = 1 / 1024;
    const left = Math.min(x0, actualX);
    const right = Math.max(x0 + 1, actualX + 1) - epsilon;
    const top = Math.min(y0, actualY);
    const bottom = Math.max(y0 + 1, actualY + 1) - epsilon;
    result.x = utils_1.clamp(dstX, left, right);
    result.y = utils_1.clamp(dstY, top, bottom);
    return { checks, result };
}
// if (srcX < dstX) {
// 	if (srcY < dstY) {
// 		if ((a * (x + 1) + b) > (y + 1)) {
// 			ty++;
// 		} else {
// 			tx++;
// 		}
// 	} else {
// 		if ((a * (x + 1) + b) < y) {
// 			ty--;
// 		} else {
// 			tx++;
// 		}
// 	}
// } else if (srcX > dstX) {
// 	if (srcY < dstY) {
// 		if ((a * x + b) > (y + 1)) {
// 			ty++;
// 		} else {
// 			tx--;
// 		}
// 	} else {
// 		if ((a * x + b) < y) {
// 			ty--;
// 		} else {
// 			tx--;
// 		}
// 	}
// } else {
// 	if (srcY < dstY) {
// 		ty++;
// 	} else {
// 		ty--;
// 	}
// }
function getCollision(srcX, srcY, dstX, dstY, x0, y0, x1, y1, out) {
    const vx = dstX - srcX;
    const vy = dstY - srcY;
    let u1 = -999999;
    let u2 = 999999;
    {
        const p = -vx;
        const q = srcX - x0;
        if (p === 0) {
            if (q < 0) {
                return false;
            }
        }
        else {
            const t = q / p;
            if (p < 0 && u1 < t) {
                u1 = t;
            }
            else if (p > 0 && u2 > t) {
                u2 = t;
            }
        }
    }
    {
        const p = vx;
        const q = x1 - srcX;
        if (p === 0) {
            if (q < 0) {
                return false;
            }
        }
        else {
            const t = q / p;
            if (p < 0 && u1 < t) {
                u1 = t;
            }
            else if (p > 0 && u2 > t) {
                u2 = t;
            }
        }
    }
    {
        const p = -vy;
        const q = srcY - y0;
        if (p === 0) {
            if (q < 0) {
                return false;
            }
        }
        else {
            const t = q / p;
            if (p < 0 && u1 < t) {
                u1 = t;
            }
            else if (p > 0 && u2 > t) {
                u2 = t;
            }
        }
    }
    {
        const p = vy;
        const q = y1 - srcY;
        if (p === 0) {
            if (q < 0) {
                return false;
            }
        }
        else {
            const t = q / p;
            if (p < 0 && u1 < t) {
                u1 = t;
            }
            else if (p > 0 && u2 > t) {
                u2 = t;
            }
        }
    }
    if (u1 > u2 || u1 > 1 || u1 < 0) {
        return false;
    }
    out.x = srcX + u1 * vx;
    out.y = srcY + u1 * vy;
    return true;
}
//# sourceMappingURL=tools-collisions.js.map