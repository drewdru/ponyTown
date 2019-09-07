"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gamepad_mappings_1 = require("../../generated/gamepad-mappings");
const clientUtils_1 = require("../clientUtils");
const JOYSTICK_THRESHHOLD = 0.2;
function createGamepad(gamepad) {
    const mapping = detectMapping(gamepad.id, navigator.userAgent);
    return { gamepad, mapping };
}
function isCompatible(mapping, id, browser) {
    for (let i = 0; i < mapping.supported.length; i++) {
        const supported = mapping.supported[i];
        if (id.indexOf(supported.id) !== -1 && browser.indexOf(supported.os) !== -1 && browser.indexOf(browser) !== -1) {
            return true;
        }
    }
    return false;
}
function detectMapping(id, browser) {
    for (let i = 0; i < gamepad_mappings_1.GAMEPAD_MAPPINGS.length; i++) {
        if (isCompatible(gamepad_mappings_1.GAMEPAD_MAPPINGS[i], id, browser)) {
            return gamepad_mappings_1.GAMEPAD_MAPPINGS[i];
        }
    }
    return gamepad_mappings_1.GAMEPAD_MAPPINGS[0];
}
function axis({ mapping, gamepad }, name) {
    const axe = mapping.axes[name];
    return axe ? gamepad.axes[axe.index] : 0;
}
function button({ mapping, gamepad }, name) {
    const button = mapping.buttons[name];
    if (!button) {
        return false;
    }
    if (button.index !== undefined) {
        return gamepad.buttons[button.index] && gamepad.buttons[button.index].pressed;
    }
    if (button.axis !== undefined) {
        if (button.direction < 0) {
            return gamepad.axes[button.axis] < -0.75;
        }
        else {
            return gamepad.axes[button.axis] > 0.75;
        }
    }
    return false;
}
class GamePadController {
    constructor(manager) {
        this.manager = manager;
        this.initialized = false;
        this.gamepadIndex = -1;
        this.zeroed1 = false;
        this.zeroed2 = false;
        this.gamepadconnected = (e) => {
            this.gamepadIndex = e.gamepad.index;
        };
        this.gamepaddisconnected = (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.scanGamepads();
            }
        };
    }
    initialize() {
        if (!this.initialized) {
            this.initialized = true;
            window.addEventListener('gamepadconnected', this.gamepadconnected);
            window.addEventListener('gamepaddisconnected', this.gamepaddisconnected);
            this.scanGamepads();
        }
    }
    release() {
        this.initialized = false;
        window.removeEventListener('gamepadconnected', this.gamepadconnected);
        window.removeEventListener('gamepaddisconnected', this.gamepaddisconnected);
    }
    update() {
        if (this.manager.disabledGamepad || !clientUtils_1.isFocused() || this.gamepadIndex === -1)
            return;
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];
        if (!gamepad) {
            this.scanGamepads();
            return;
        }
        const pad = createGamepad(gamepad);
        this.zeroed1 = readAxis(this.manager, 307 /* GAMEPAD_AXIS1_X */, 308 /* GAMEPAD_AXIS1_Y */, axis(pad, 0 /* LeftStickX */), axis(pad, 1 /* LeftStickY */), this.zeroed1);
        this.zeroed2 = readAxis(this.manager, 309 /* GAMEPAD_AXIS2_X */, 310 /* GAMEPAD_AXIS2_Y */, axis(pad, 2 /* RightStickX */), axis(pad, 3 /* RightStickY */), this.zeroed2);
        this.manager.setValue(313 /* GAMEPAD_BUTTON_X */, button(pad, 2 /* X */) ? 1 : 0);
        this.manager.setValue(314 /* GAMEPAD_BUTTON_Y */, button(pad, 3 /* Y */) ? 1 : 0);
        this.manager.setValue(311 /* GAMEPAD_BUTTON_A */, button(pad, 0 /* A */) ? 1 : 0);
        this.manager.setValue(312 /* GAMEPAD_BUTTON_B */, button(pad, 1 /* B */) ? 1 : 0);
        this.manager.setValue(324 /* GAMEPAD_BUTTON_DOWN */, button(pad, 6 /* DpadDown */) ? 1 : 0);
        this.manager.setValue(325 /* GAMEPAD_BUTTON_LEFT */, button(pad, 7 /* DpadLeft */) ? 1 : 0);
        this.manager.setValue(326 /* GAMEPAD_BUTTON_RIGHT */, button(pad, 8 /* DpadRight */) ? 1 : 0);
        this.manager.setValue(323 /* GAMEPAD_BUTTON_UP */, button(pad, 9 /* DpadUp */) ? 1 : 0);
    }
    clear() {
    }
    scanGamepads() {
        const gamepads = navigator.getGamepads();
        // Using regular loop because of issues with iterating over gamepads
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad) {
                this.gamepadIndex = gamepad.index;
                return;
            }
        }
        this.gamepadIndex = -1;
    }
}
exports.GamePadController = GamePadController;
function readAxis(manager, keyX, keyY, axisX, axisY, zeroed) {
    const dist = Math.sqrt(axisX * axisX + axisY * axisY);
    if (dist > JOYSTICK_THRESHHOLD) {
        const scaledDist = Math.min((dist - JOYSTICK_THRESHHOLD) / (1 - JOYSTICK_THRESHHOLD), 1);
        const theta = Math.atan2(axisY, axisX);
        manager.setValue(keyX, Math.cos(theta) * scaledDist);
        manager.setValue(keyY, Math.sin(theta) * scaledDist);
        return false;
    }
    else if (!zeroed) {
        manager.setValue(keyX, 0);
        manager.setValue(keyY, 0);
        return true;
    }
    return zeroed;
}
//# sourceMappingURL=gamepad.js.map