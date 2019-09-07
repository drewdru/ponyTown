"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const keyboard_1 = require("./keyboard");
const mouse_1 = require("./mouse");
const touch_1 = require("./touch");
const gamepad_1 = require("./gamepad");
const utils_1 = require("../../common/utils");
const KEYS = 330 /* MAX_VALUE */;
class InputManager {
    constructor() {
        this.disabledGamepad = false;
        this.disabledKeyboard = false;
        this.disableArrows = false;
        this.usingTouch = false;
        this.controllers = [];
        this.state = utils_1.array(KEYS, 0);
        this.prevState = utils_1.array(KEYS, 0);
        this.actions = utils_1.times(KEYS, () => []);
    }
    get axisX() {
        const axisX = this.getRange(307 /* GAMEPAD_AXIS1_X */);
        const left = this.disableArrows ? this.getState(65 /* KEY_A */) : this.getState(37 /* LEFT */, 65 /* KEY_A */);
        const right = this.disableArrows ? this.getState(68 /* KEY_D */) : this.getState(39 /* RIGHT */, 68 /* KEY_D */);
        const x = axisX + (left ? -1 : (right ? 1 : 0));
        return lodash_1.clamp(x, -1, 1);
    }
    get axisY() {
        const axisY = this.getRange(308 /* GAMEPAD_AXIS1_Y */);
        const up = this.disableArrows ? this.getState(87 /* KEY_W */) : this.getState(38 /* UP */, 87 /* KEY_W */);
        const down = this.disableArrows ? this.getState(83 /* KEY_S */) : this.getState(40 /* DOWN */, 83 /* KEY_S */);
        const y = axisY + (up ? -1 : (down ? 1 : 0));
        return lodash_1.clamp(y, -1, 1);
    }
    get isMovementFromButtons() {
        const up = this.getState(38 /* UP */, 87 /* KEY_W */);
        const down = this.getState(40 /* DOWN */, 83 /* KEY_S */);
        const left = this.getState(37 /* LEFT */, 65 /* KEY_A */);
        const right = this.getState(39 /* RIGHT */, 68 /* KEY_D */);
        return up || down || left || right;
    }
    get axis2X() {
        return lodash_1.clamp(this.getRange(309 /* GAMEPAD_AXIS2_X */), -1, 1);
    }
    get axis2Y() {
        return lodash_1.clamp(this.getRange(310 /* GAMEPAD_AXIS2_Y */), -1, 1);
    }
    get pointerX() {
        return this.getRange(300 /* MOUSE_X */);
    }
    get pointerY() {
        return this.getRange(301 /* MOUSE_Y */);
    }
    get wheelX() {
        return this.getRange(305 /* MOUSE_WHEEL_X */);
    }
    get wheelY() {
        return this.getRange(306 /* MOUSE_WHEEL_Y */);
    }
    initialize(element) {
        this.controllers = [
            new keyboard_1.KeyboardController(this),
            new mouse_1.MouseController(this),
            new touch_1.TouchController(this),
            new gamepad_1.GamePadController(this),
        ];
        this.controllers.forEach(c => c.initialize(element));
        this.clear();
    }
    release() {
        this.controllers.forEach(c => c.release());
        this.controllers = [];
        this.clear();
    }
    update() {
        for (const controller of this.controllers) {
            controller.update();
        }
    }
    end() {
        for (let i = 0; i < KEYS; i++) {
            this.prevState[i] = this.state[i];
        }
        this.setValue(328 /* TOUCH_CLICK */, 0);
        this.setValue(329 /* TOUCH_SECOND_CLICK */, 0);
        this.setValue(305 /* MOUSE_WHEEL_X */, 0);
        this.setValue(306 /* MOUSE_WHEEL_Y */, 0);
    }
    clear() {
        for (let i = 0; i < KEYS; i++) {
            this.state[i] = 0;
            this.prevState[i] = 0;
        }
        for (const controller of this.controllers) {
            controller.clear();
        }
    }
    onPressed(inputs, handler) {
        this.onAction(inputs, (_, v) => {
            if (v === 1) {
                handler();
            }
        });
    }
    onReleased(inputs, handler) {
        this.onAction(inputs, (_, v) => {
            if (v === 0) {
                handler();
            }
        });
    }
    isPressed(key) {
        return this.state[key] !== 0;
    }
    wasPressed(key) {
        return this.state[key] === 1 && this.prevState[key] === 0;
    }
    onAction(inputs, handler) {
        const inputsArray = Array.isArray(inputs) ? inputs : [inputs];
        for (const i of inputsArray) {
            this.actions[i].push(handler);
        }
    }
    getState(...inputs) {
        for (const i of inputs) {
            if (this.state[i] !== 0) {
                return true;
            }
        }
        return false;
    }
    getRange(input) {
        return this.state[input];
    }
    setValue(input, value) {
        if (input < 0 || input >= KEYS) {
            console.warn(`Input out of range: ${input}`);
        }
        else if (this.state[input] !== value) {
            this.state[input] = value;
            if (this.actions[input] && this.actions[input].length) {
                for (const action of this.actions[input]) {
                    action(input, value);
                }
                return true;
            }
        }
        return false;
    }
    addValue(input, value) {
        if (input < 0 || input >= KEYS) {
            console.warn(`Input out of range: ${input}`);
        }
        else {
            this.state[input] += value;
        }
    }
}
exports.InputManager = InputManager;
//# sourceMappingURL=inputManager.js.map