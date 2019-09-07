"use strict";
/// <reference path="../../typings/my.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
require('source-map-support').install();
require("core-js/stable/promise/finally");
require("reflect-metadata");
const Promise = require("bluebird");
const fs = require("fs");
const yargs_1 = require("yargs");
global.DEVELOPMENT = process.env.NODE_ENV !== 'production';
global.BETA = !!yargs_1.argv.beta;
global.TOOLS = !!yargs_1.argv.tools;
global.SERVER = true;
global.TIMING = false;
global.TESTS = false;
global.performance = Date;
Promise.promisifyAll(fs);
//# sourceMappingURL=boot.js.map