"use strict";
/* tslint:disable:max-line-length */
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
function browser(browser, id, os) {
    return { browser, id, os };
}
function index(index) {
    return { index };
}
function positive(buttonPositive) {
    return { buttonPositive };
}
function positiveNegative(buttonPositive, buttonNegative) {
    return { buttonPositive, buttonNegative };
}
function axisDirection(axis, direction) {
    return { axis, direction };
}
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
exports.GAMEPAD_MAPPINGS = [
    gamepad('Logitech F310 (DirectInput) Chrome/Firefox Linux', [
        browser('Chrome', 'Logitech Logitech Dual Action (Vendor: 046d Product: c216)', 'Linux'),
        browser('Firefox', '046d-c216-Logitech Logitech Dual Action', 'Linux'),
    ], axes(0, 1, 2, 3, index(4), index(5)), buttons(1, 2, 0, 3, 8, 9, axisDirection(5, 1), axisDirection(4, -1), axisDirection(4, 1), axisDirection(5, -1), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
    gamepad('Logitech F310 (DirectInput) Chrome Windows/OSX', [
        browser('Chrome', 'Logitech Dual Action (STANDARD GAMEPAD Vendor: 046d Product: c216)', 'Mac OS X'),
        browser('Chrome', 'Logitech Dual Action (STANDARD GAMEPAD Vendor: 046d Product: c216)', 'Windows NT'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
    gamepad('Logitech F310 (DirectInput) Firefox OSX', [
        browser('Firefox', '46d-c216-Logitech Dual Action', 'Mac OS X'),
    ], axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)), buttons(1, 2, 0, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(2, 1), axisDirection(1, -1), axisDirection(1, 1), axisDirection(2, -1), index(6), 5, 11, axisDirection(4, 1), axisDirection(3, -1), undefined, axisDirection(4, -1), index(7), undefined)),
    gamepad('Logitech F310 (DirectInput) Firefox Windows', [
        browser('Firefox', '046d-c216-Logitech Dual Action', 'Windows NT'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(1, 2, 0, 3, 8, 9, index(14), index(15), index(16), index(13), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
    gamepad('Logitech F310 (XInput) Chrome Linux', [
        browser('Chrome', 'Logitech Gamepad F310 (STANDARD GAMEPAD Vendor: 046d Product: c21d)', 'Linux'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('Logitech F310 (XInput) Firefox Linux', [
        browser('Firefox', '046d-c21d-Logitech Gamepad F310', 'Linux'),
    ], axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)), buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
    gamepad('PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268) Chrome OSX Linux', [
        browser('Chrome', 'PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268)', 'Mac OS X'),
        browser('Chrome', 'Sony PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268)', 'Linux'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('054c-0268-Sony PLAYSTATION(R)3 Controller Firefox Linux', [
        browser('Firefox', '054c-0268-Sony PLAYSTATION(R)3 Controller', 'Linux'),
    ], axes(0, 1, 2, 3, index(6), index(7), index(12), index(13)), buttons(14, 13, 15, 12, 0, 3, index(6), index(7), index(5), index(4), 10, 1, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(8), 11, 2, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(9), 16)),
    gamepad('PS4 Chrome Linux', [
        browser('Chrome', 'Sony Computer Entertainment Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Linux'),
    ], axes(0, 1, 2, 3, positiveNegative(15, 14), positiveNegative(13, 12), positive(6), positive(7)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('PS4 Chrome Windows/OSX', [
        browser('Chrome', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Windows NT'),
        browser('Chrome', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Mac OS X'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('PS4 Firefox Linux', [
        browser('Firefox', '054c-05c4-Sony Computer Entertainment Wireless Controller', 'Linux'),
    ], axes(0, 1, 2, 5, index(6), index(7), index(3), index(4)), buttons(1, 2, 0, 3, 8, 9, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(5, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(5, -1), index(7), 12)),
    gamepad('PS4 Firefox OSX', [
        browser('Firefox', '54c-5c4-Wireless Controller', 'Mac OS X'),
    ], axes(0, 1, 2, 5, index(6), index(7)), buttons(0, 1, 2, 3, 8, 9, index(15), index(16), index(17), index(14), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(5, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(5, -1), index(7), 12)),
    gamepad('XBone Chrome Linux', [
        browser('Chrome', 'Microsoft Controller (Vendor: 045e Product: 02d1)', 'Linux'),
    ], axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)), buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
    gamepad('Xbox One Chrome OSX Linux', [
        browser('Chrome', '©Microsoft Corporation Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)', 'Linux'),
        browser('Chrome', 'Xbox One Controller (STANDARD GAMEPAD Vendor: 02d1 Product: 045e)', 'Mac OS X'),
    ], axes(0, 1, 2, 3), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('Xbone Firefox Linux', [
        browser('Firefox', '045e-02d1-Microsoft X-Box One pad', 'Linux'),
    ], axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)), buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
    gamepad('Xbox 360 Chrome Windows/OSX', [
        browser('Chrome', 'Xbox 360 Controller (STANDARD GAMEPAD Vendor: 028e Product: 045e)', 'Mac OS X'),
        browser('Chrome', 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', 'Windows NT'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), 16)),
    gamepad('Xbox 360 Firefox Linux', [
        browser('Firefox', '045e-028e-Microsoft X-Box 360 pad', 'Linux'),
    ], axes(0, 1, 3, 4, index(6), index(7), index(2), index(5)), buttons(0, 1, 2, 3, 6, 7, axisDirection(7, 1), axisDirection(6, -1), axisDirection(6, 1), axisDirection(7, -1), 4, 9, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), axisDirection(2, 1), 5, 10, axisDirection(4, 1), axisDirection(3, -1), axisDirection(3, 1), axisDirection(4, -1), axisDirection(5, 1), 8)),
    gamepad('Xbox 360 FF Windows', [
        browser('Firefox', 'xinput', 'Windows NT'),
    ], axes(0, 1, 2, 3, index(6), index(7), undefined, index(5)), buttons(0, 1, 2, 3, 8, 9, index(13), index(14), index(15), index(12), 4, 10, axisDirection(1, 1), axisDirection(0, -1), axisDirection(0, 1), axisDirection(1, -1), index(6), 5, 11, axisDirection(3, 1), axisDirection(2, -1), axisDirection(2, 1), axisDirection(3, -1), index(7), undefined)),
];
//# sourceMappingURL=gamepad-mappings.js.map