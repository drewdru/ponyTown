/* tslint:disable:max-line-length */

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

function gamepad(name: string, supported: GamepadBrowser[], axes: AxesTable, buttons: ButtonsTable): GamepadMapping {
	return { name, supported, axes, buttons };
}

function browser(browser: string, id: string, os: string): GamepadBrowser {
	return { browser, id, os };
}

function index(index: number): Index {
	return { index };
}

function positive(buttonPositive: number): Positive {
	return { buttonPositive };
}

function positiveNegative(buttonPositive: number, buttonNegative: number): PositiveNegative {
	return { buttonPositive, buttonNegative };
}

function axisDirection(axis: number, direction: number): AxisDirection {
	return { axis, direction };
}

function axes(
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

function buttons(
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
	gamepad('Logitech F310 (DirectInput) Chrome/Firefox Linux', [
		browser('Chrome', 'Logitech Logitech Dual Action (Vendor: 046d Product: c216)', 'Linux'),
		browser('Firefox', '046d-c216-Logitech Logitech Dual Action', 'Linux'),
	],
		axes(0, 1, 2, 3, index(4), index(5)),
		buttons(1, 2, 0, 3, 8, 9, axisDirection(5, 1), axisDirection(4, -1), axisDirection(4, 1), axisDirection(5, -1), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
	gamepad('Logitech F310 (DirectInput) Chrome Windows/OSX', [
		browser('Chrome', 'Logitech Dual Action (STANDARD GAMEPAD Vendor: 046d Product: c216)', 'Mac OS X'),
		browser('Chrome', 'Logitech Dual Action (STANDARD GAMEPAD Vendor: 046d Product: c216)', 'Windows NT'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
	gamepad('Logitech F310 (DirectInput) Firefox OSX', [
		browser('Firefox', '46d-c216-Logitech Dual Action', 'Mac OS X'),
	],
		axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)),
		buttons(1, 2, 0, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(2, 1), axisDirection(1, -1), axisDirection(1, 1), axisDirection(2, -1), index(6), 5, 11, axisDirection(4, 1), axisDirection(3, -1), undefined, axisDirection(4, -1), index(7), undefined)),
	gamepad('Logitech F310 (DirectInput) Firefox Windows', [
		browser('Firefox', '046d-c216-Logitech Dual Action', 'Windows NT'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(1, 2, 0, 3, 8, 9, index(14), index(15), index(16), index(13), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
	gamepad('Logitech F310 (XInput) Chrome Linux', [
		browser('Chrome', 'Logitech Gamepad F310 (STANDARD GAMEPAD Vendor: 046d Product: c21d)', 'Linux'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('Logitech F310 (XInput) Firefox Linux', [
		browser('Firefox', '046d-c21d-Logitech Gamepad F310', 'Linux'),
	],
		axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)),
		buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
	gamepad('PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268) Chrome OSX Linux', [
		browser('Chrome', 'PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268)', 'Mac OS X'),
		browser('Chrome', 'Sony PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268)', 'Linux'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('054c-0268-Sony PLAYSTATION(R)3 Controller Firefox Linux', [
		browser('Firefox', '054c-0268-Sony PLAYSTATION(R)3 Controller', 'Linux'),
	],
		axes(0, 1, 2, 3, index(6), index(7), index(12), index(13)),
		buttons(14, 13, 15, 12, 0, 3, index(6), index(7), index(5), index(4), 10, 1, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(8), 11, 2, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(9), 16)),
	gamepad('PS4 Chrome Linux', [
		browser('Chrome', 'Sony Computer Entertainment Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Linux'),
	],
		axes(0, 1, 2, 3, positiveNegative(15, 14), positiveNegative(13, 12), positive(6), positive(7)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('PS4 Chrome Windows/OSX', [
		browser('Chrome', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Windows NT'),
		browser('Chrome', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Mac OS X'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('PS4 Firefox Linux', [
		browser('Firefox', '054c-05c4-Sony Computer Entertainment Wireless Controller', 'Linux'),
	],
		axes(0, 1, 2, 5, index(6), index(7), index(3), index(4)),
		buttons(1, 2, 0, 3, 8, 9, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(5, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(5, -1), index(7), 12)),
	gamepad('PS4 Firefox OSX', [
		browser('Firefox', '54c-5c4-Wireless Controller', 'Mac OS X'),
	],
		axes(0, 1, 2, 5, index(6), index(7)),
		buttons(0, 1, 2, 3, 8, 9, index(15), index(16), index(17), index(14), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(5, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(5, -1), index(7), 12)),
	gamepad('XBone Chrome Linux', [
		browser('Chrome', 'Microsoft Controller (Vendor: 045e Product: 02d1)', 'Linux'),
	],
		axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)),
		buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
	gamepad('Xbox One Chrome OSX Linux', [
		browser('Chrome', '©Microsoft Corporation Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)', 'Linux'),
		browser('Chrome', 'Xbox One Controller (STANDARD GAMEPAD Vendor: 02d1 Product: 045e)', 'Mac OS X'),
	],
		axes(0, 1, 2, 3),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('Xbone Firefox Linux', [
		browser('Firefox', '045e-02d1-Microsoft X-Box One pad', 'Linux'),
	],
		axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)),
		buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
	gamepad('Xbox 360 Chrome Windows/OSX', [
		browser('Chrome', 'Xbox 360 Controller (STANDARD GAMEPAD Vendor: 028e Product: 045e)', 'Mac OS X'),
		browser('Chrome', 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', 'Windows NT'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
	gamepad('Xbox 360 Firefox Linux', [
		browser('Firefox', '045e-028e-Microsoft X-Box 360 pad', 'Linux'),
	],
		axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)),
		buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
	gamepad('Xbox 360 FF Windows', [
		browser('Firefox', 'xinput', 'Windows NT'),
	],
		axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)),
		buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
];
