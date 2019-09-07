interface Point {
	x: number;
	y: number;
}

type Pt = [number, number];

const createPoint = ([x, y]: Pt): Point => ({ x, y });
const createPoints = (pts: Pt[]) => pts.map(createPoint);

export const cmOffsets: Point[] = [];
export const headOffsets: Point[] = [];
export const tailOffsets: Point[] = [];
export const wingOffsets: Point[] = [];
export const frontLegOffsets: Point[] = [];
export const backLegOffsets: Point[] = [];
export const neckAccessoryOffsets: Point[] = [];
export const backAccessoryOffsets: Point[] = [];
export const waistAccessoryOffsets: Point[] = [];
export const chestAccessoryOffsets: Point[] = [];

function offsets(
	_index: number, cm: Pt, head: Pt, tail: Pt, wing: Pt, frontLeg: Pt, backLeg: Pt,
	neckAccessory: Pt, backAccessory: Pt, waistAccessory: Pt, chestAccessory: Pt
) {
	cmOffsets.push(createPoint(cm));
	headOffsets.push(createPoint(head));
	tailOffsets.push(createPoint(tail));
	wingOffsets.push(createPoint(wing));
	frontLegOffsets.push(createPoint(frontLeg));
	backLegOffsets.push(createPoint(backLeg));
	neckAccessoryOffsets.push(createPoint(neckAccessory));
	backAccessoryOffsets.push(createPoint(backAccessory));
	waistAccessoryOffsets.push(createPoint(waistAccessory));
	chestAccessoryOffsets.push(createPoint(chestAccessory));
}

// stand:   cm      head    tail    wing  frontLeg backLeg       neck    back    waist   chest
offsets(0, [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], /***/[0, 0], [0, 0], [0, 0], [0, 0]);

// sit:     cm      head    tail    wing  frontLeg backLeg       neck    back    waist   chest
offsets(1, [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], /***/[0, 0], [0, 0], [0, 0], [0, 0]);
offsets(2, [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], /***/[0, 0], [0, 0], [0, 1], [1, 1]);
offsets(3, [1, 1], [0, 1], [1, 1], [2, 1], [2, 0], [2, 0], /***/[2, 1], [1, 1], [0, 1], [2, 2]);
offsets(4, [4, 2], [2, 3], [4, 3], [5, 2], [5, 2], [5, 2], /***/[4, 3], [4, 3], [3, 3], [5, 4]);
offsets(5, [7, 6], [4, 6], [7, 7], [7, 4], [7, 4], [7, 6], /***/[6, 5], [6, 6], [5, 5], [7, 6]);
offsets(6, [8, 9], [7, 8], [9, 14], [8, 7], [9, 5], [8, 8], /***/[9, 8], [8, 7], [8, 7], [9, 8]);
offsets(7, [8, 12], [8, 8], [9, 15], [9, 9], [9, 5], [8, 11], /***/[9, 7], [8, 8], [8, 7], [9, 7]);
offsets(8, [8, 12], [9, 7], [9, 15], [9, 9], [9, 5], [8, 11], /***/[9, 7], [8, 8], [8, 7], [9, 7]);
offsets(9, [8, 11], [9, 6], [9, 14], [9, 8], [9, 5], [8, 11], /***/[9, 6], [8, 8], [8, 7], [9, 6]);

// lie:      cm       head    tail     wing  frontLeg backLeg        neck    back    waist   chest
offsets(10, [8, 11], [8, 6], [9, 14], [9, 9], [9, 6], [8, 11], /***/[9, 6], [8, 8], [8, 7], [9, 6]);
offsets(11, [8, 11], [7, 7], [9, 14], [8, 9], [8, 6], [8, 11], /***/[8, 7], [8, 8], [7, 7], [8, 6]);
offsets(12, [8, 11], [6, 9], [9, 14], [7, 10], [7, 7], [8, 11], /***/[7, 9], [8, 8], [6, 8], [7, 7]);
offsets(13, [8, 11], [6, 11], [9, 14], [7, 10], [6, 9], [8, 11], /***/[6, 11], [8, 8], [5, 10], [6, 9]);
offsets(14, [8, 11], [7, 12], [9, 14], [7, 11], [6, 9], [8, 11], /***/[7, 12], [8, 8], [6, 10], [7, 10]);
offsets(15, [8, 11], [7, 11], [9, 14], [7, 11], [6, 9], [8, 11], /***/[7, 11], [8, 8], [6, 10], [7, 9]);
offsets(16, [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], /***/[0, 0], [0, 0], [0, 0], [0, 0]);

export const EAR_ACCESSORY_OFFSETS = createPoints([
	[0, 0], // 0
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0], // 5
]);

export const EXTRA_ACCESSORY_OFFSETS = createPoints([
	[0, 9], // 0
	[0, 0],
	[0, 0],
	[0, 1],
	[0, 2],
	[0, 2], // 5
	[0, 1],
	[0, 1],
	[0, 2],
	[0, 3],
	[0, 2], // 10
	[0, 2],
	[0, 3],
	[0, 1],
	[0, 1],
	[0, 1], // 15
	[0, 9],
	[0, 3],
	[0, 3],
	[0, 3],
	[0, 3], // 20
	[0, 3],
	[0, 2],
	[0, 3],
	[0, 3],
	[0, 3], // 25
	[0, 2],
	[0, 3],
	[-1, 3],
	[0, 3],
	[0, 3], // 30
	[0, 3],
]);

export const HEAD_ACCESSORY_OFFSETS = createPoints([
	[0, 0], // 0
	[0, -5],
	[0, -5],
	[0, -4],
	[0, -4],
	[0, -4], // 5
	[0, -4],
	[1, -4],
	[0, -4],
	[0, -3],
	[0, -4], // 10
	[0, -4],
	[0, -3],
	[1, -5],
	[0, -4],
	[0, -4], // 15
	[0, 0],
	[0, -4],
	[0, -4],
	[0, -4],
	[0, -4], // 20
	[0, -4],
	[0, -5],
	[0, -5],
	[0, -4],
	[1, -3], // 25
	[0, -4],
	[0, -4],
	[0, -4],
	[0, -4],
	[0, -4], // 30
	[0, -3],
]);
