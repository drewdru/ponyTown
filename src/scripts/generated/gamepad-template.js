"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GamepadAxes;
(function (GamepadAxes) {
    GamepadAxes[GamepadAxes["LeftStickX"] = 0] = "LeftStickX";
    GamepadAxes[GamepadAxes["LeftStickY"] = 1] = "LeftStickY";
    GamepadAxes[GamepadAxes["RightStickX"] = 2] = "RightStickX";
    GamepadAxes[GamepadAxes["RightStickY"] = 3] = "RightStickY";
    GamepadAxes[GamepadAxes["DpadX"] = 4] = "DpadX";
    GamepadAxes[GamepadAxes["DpadY"] = 5] = "DpadY";
    GamepadAxes[GamepadAxes["LeftTrigger"] = 6] = "LeftTrigger";
    GamepadAxes[GamepadAxes["RightTrigger"] = 7] = "RightTrigger";
})(GamepadAxes = exports.GamepadAxes || (exports.GamepadAxes = {}));
var GamepadButtons;
(function (GamepadButtons) {
    GamepadButtons[GamepadButtons["A"] = 0] = "A";
    GamepadButtons[GamepadButtons["B"] = 1] = "B";
    GamepadButtons[GamepadButtons["X"] = 2] = "X";
    GamepadButtons[GamepadButtons["Y"] = 3] = "Y";
    GamepadButtons[GamepadButtons["Back"] = 4] = "Back";
    GamepadButtons[GamepadButtons["Start"] = 5] = "Start";
    GamepadButtons[GamepadButtons["DpadDown"] = 6] = "DpadDown";
    GamepadButtons[GamepadButtons["DpadLeft"] = 7] = "DpadLeft";
    GamepadButtons[GamepadButtons["DpadRight"] = 8] = "DpadRight";
    GamepadButtons[GamepadButtons["DpadUp"] = 9] = "DpadUp";
    GamepadButtons[GamepadButtons["LeftShoulder"] = 10] = "LeftShoulder";
    GamepadButtons[GamepadButtons["LeftStick"] = 11] = "LeftStick";
    GamepadButtons[GamepadButtons["LeftStickDown"] = 12] = "LeftStickDown";
    GamepadButtons[GamepadButtons["LeftStickLeft"] = 13] = "LeftStickLeft";
    GamepadButtons[GamepadButtons["LeftStickRight"] = 14] = "LeftStickRight";
    GamepadButtons[GamepadButtons["LeftStickUp"] = 15] = "LeftStickUp";
    GamepadButtons[GamepadButtons["LeftTrigger"] = 16] = "LeftTrigger";
    GamepadButtons[GamepadButtons["RightShoulder"] = 17] = "RightShoulder";
    GamepadButtons[GamepadButtons["RightStick"] = 18] = "RightStick";
    GamepadButtons[GamepadButtons["RightStickDown"] = 19] = "RightStickDown";
    GamepadButtons[GamepadButtons["RightStickLeft"] = 20] = "RightStickLeft";
    GamepadButtons[GamepadButtons["RightStickRight"] = 21] = "RightStickRight";
    GamepadButtons[GamepadButtons["RightStickUp"] = 22] = "RightStickUp";
    GamepadButtons[GamepadButtons["RightTrigger"] = 23] = "RightTrigger";
    GamepadButtons[GamepadButtons["Home"] = 24] = "Home";
})(GamepadButtons = exports.GamepadButtons || (exports.GamepadButtons = {}));
function gamepad(name, supported, axes, buttons) {
    return { name, supported, axes, buttons };
}
exports.gamepad = gamepad;
function browser(browser, id, os) {
    return { browser, id, os };
}
exports.browser = browser;
function index(index) {
    return { index };
}
exports.index = index;
function positive(buttonPositive) {
    return { buttonPositive };
}
exports.positive = positive;
function positiveNegative(buttonPositive, buttonNegative) {
    return { buttonPositive, buttonNegative };
}
exports.positiveNegative = positiveNegative;
function axisDirection(axis, direction) {
    return { axis, direction };
}
exports.axisDirection = axisDirection;
function axes(lx, ly, rx, ry, dpadX, dpadY, lt, rt) {
    const result = [];
    result[0 /* LeftStickX */] = index(lx);
    result[1 /* LeftStickY */] = index(ly);
    result[2 /* RightStickX */] = index(rx);
    result[3 /* RightStickY */] = index(ry);
    result[4 /* DpadX */] = dpadX;
    result[5 /* DpadY */] = dpadY;
    result[6 /* LeftTrigger */] = lt;
    result[7 /* RightTrigger */] = rt;
    return result;
}
exports.axes = axes;
function buttons(a, b, x, y, back, start, dpad_down, dpad_left, dpad_right, dpad_up, left_shoulder, left_stick, left_stick_down, left_stick_left, left_stick_right, left_stick_up, left_trigger, right_shoulder, right_stick, right_stick_down, right_stick_left, right_stick_right, right_stick_up, right_trigger, home) {
    const result = [];
    result[0 /* A */] = index(a);
    result[1 /* B */] = index(b);
    result[2 /* X */] = index(x);
    result[3 /* Y */] = index(y);
    result[4 /* Back */] = index(back);
    result[5 /* Start */] = index(start);
    result[6 /* DpadDown */] = dpad_down;
    result[7 /* DpadLeft */] = dpad_left;
    result[8 /* DpadRight */] = dpad_right;
    result[9 /* DpadUp */] = dpad_up;
    result[10 /* LeftShoulder */] = index(left_shoulder);
    result[11 /* LeftStick */] = index(left_stick);
    result[12 /* LeftStickDown */] = left_stick_down;
    result[13 /* LeftStickLeft */] = left_stick_left;
    result[14 /* LeftStickRight */] = left_stick_right;
    result[15 /* LeftStickUp */] = left_stick_up;
    result[16 /* LeftTrigger */] = left_trigger;
    result[17 /* RightShoulder */] = index(right_shoulder);
    result[18 /* RightStick */] = index(right_stick);
    result[19 /* RightStickDown */] = right_stick_down;
    result[20 /* RightStickLeft */] = right_stick_left;
    result[21 /* RightStickRight */] = right_stick_right;
    result[22 /* RightStickUp */] = right_stick_up;
    result[23 /* RightTrigger */] = right_trigger;
    result[24 /* Home */] = home ? index(home) : undefined;
    return result;
}
exports.buttons = buttons;
exports.GAMEPAD_MAPPINGS = [
/*MAPPINGS*/
];
//# sourceMappingURL=gamepad-template.js.map