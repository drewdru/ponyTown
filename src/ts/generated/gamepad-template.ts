export interface GamepadMapping {
	axes: AxesTable;
	buttons: ButtonsTable;
	name: string;
	supported: any[];
}

interface Index {
	index: number;
}

interface PositiveNegative {
	buttonPositive: number;
	buttonNegative: number;
}

interface Positive {
	buttonPositive: number;
}

interface AxisDirection {
	axis: number;
	direction: number;
}

export const enum GamepadAxes {
	LeftStickX,
	LeftStickY,
	RightStickX,
	RightStickY,
	DpadX,
	DpadY,
	LeftTrigger,
	RightTrigger,
}

export interface AxesTable {
	[key: number]: Index | Positive | PositiveNegative | undefined;
}

export const enum GamepadButtons {
	A,
	B,
	X,
	Y,
	Back,
	Start,
	DpadDown,
	DpadLeft,
	DpadRight,
	DpadUp,
	LeftShoulder,
	LeftStick,
	LeftStickDown,
	LeftStickLeft,
	LeftStickRight,
	LeftStickUp,
	LeftTrigger,
	RightShoulder,
	RightStick,
	RightStickDown,
	RightStickLeft,
	RightStickRight,
	RightStickUp,
	RightTrigger,
	Home,
}

export interface GamepadBrowser {
	browser: string;
	id: string;
	os: string;
}

export interface ButtonsTable {
	[key: number]: Index | AxisDirection | undefined;
}

export function gamepad(name: string, supported: GamepadBrowser[], axes: AxesTable, buttons: ButtonsTable): GamepadMapping {
	return { name, supported, axes, buttons };
}

export function browser(browser: string, id: string, os: string): GamepadBrowser {
	return { browser, id, os };
}

export function index(index: number): Index {
	return { index };
}

export function positive(buttonPositive: number): Positive {
	return { buttonPositive };
}

export function positiveNegative(buttonPositive: number, buttonNegative: number): PositiveNegative {
	return { buttonPositive, buttonNegative };
}

export function axisDirection(axis: number, direction: number): AxisDirection {
	return { axis, direction };
}

export function axes(
	lx: number, ly: number, rx: number, ry: number, dpadX?: Index | PositiveNegative, dpadY?: Index | PositiveNegative,
	lt?: Index | Positive, rt?: Index | Positive
): AxesTable {
	const result: AxesTable = [];
	result[GamepadAxes.LeftStickX] = index(lx);
	result[GamepadAxes.LeftStickY] = index(ly);
	result[GamepadAxes.RightStickX] = index(rx);
	result[GamepadAxes.RightStickY] = index(ry);
	result[GamepadAxes.DpadX] = dpadX;
	result[GamepadAxes.DpadY] = dpadY;
	result[GamepadAxes.LeftTrigger] = lt;
	result[GamepadAxes.RightTrigger] = rt;
	return result;
}

export function buttons(
	a: number,
	b: number,
	x: number,
	y: number,
	back: number,
	start: number,
	dpad_down: Index | AxisDirection,
	dpad_left: Index | AxisDirection,
	dpad_right: Index | AxisDirection,
	dpad_up: Index | AxisDirection,
	left_shoulder: number,
	left_stick: number,
	left_stick_down: AxisDirection,
	left_stick_left: AxisDirection,
	left_stick_right: AxisDirection,
	left_stick_up: AxisDirection,
	left_trigger: Index | AxisDirection,
	right_shoulder: number,
	right_stick: number,
	right_stick_down: AxisDirection,
	right_stick_left: AxisDirection,
	right_stick_right: AxisDirection | undefined,
	right_stick_up: AxisDirection,
	right_trigger: Index | AxisDirection,
	home?: number,
): ButtonsTable {
	const result: ButtonsTable = [];
	result[GamepadButtons.A] = index(a);
	result[GamepadButtons.B] = index(b);
	result[GamepadButtons.X] = index(x);
	result[GamepadButtons.Y] = index(y);
	result[GamepadButtons.Back] = index(back);
	result[GamepadButtons.Start] = index(start);
	result[GamepadButtons.DpadDown] = dpad_down;
	result[GamepadButtons.DpadLeft] = dpad_left;
	result[GamepadButtons.DpadRight] = dpad_right;
	result[GamepadButtons.DpadUp] = dpad_up;
	result[GamepadButtons.LeftShoulder] = index(left_shoulder);
	result[GamepadButtons.LeftStick] = index(left_stick);
	result[GamepadButtons.LeftStickDown] = left_stick_down;
	result[GamepadButtons.LeftStickLeft] = left_stick_left;
	result[GamepadButtons.LeftStickRight] = left_stick_right;
	result[GamepadButtons.LeftStickUp] = left_stick_up;
	result[GamepadButtons.LeftTrigger] = left_trigger;
	result[GamepadButtons.RightShoulder] = index(right_shoulder);
	result[GamepadButtons.RightStick] = index(right_stick);
	result[GamepadButtons.RightStickDown] = right_stick_down;
	result[GamepadButtons.RightStickLeft] = right_stick_left;
	result[GamepadButtons.RightStickRight] = right_stick_right;
	result[GamepadButtons.RightStickUp] = right_stick_up;
	result[GamepadButtons.RightTrigger] = right_trigger;
	result[GamepadButtons.Home] = home ? index(home) : undefined;
	return result;
}

export const GAMEPAD_MAPPINGS: GamepadMapping[] = [
	/*MAPPINGS*/
];
