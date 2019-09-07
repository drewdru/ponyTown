/// <reference path="../../typings/my.d.ts" />

require('source-map-support').install();

import 'core-js/stable/promise/finally';
import 'reflect-metadata';
import * as Promise from 'bluebird';
import * as fs from 'fs';
import { argv } from 'yargs';

(global as any).DEVELOPMENT = process.env.NODE_ENV !== 'production';
(global as any).BETA = !!argv.beta;
(global as any).TOOLS = !!argv.tools;
(global as any).SERVER = true;
(global as any).TIMING = false;
(global as any).TESTS = false;
(global as any).performance = Date;

Promise.promisifyAll(fs);
