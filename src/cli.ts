#!/usr/bin/env node

import amberpine, { init } from './index.js';
import devServer from './dev-server.js';

const [, , ...args] = process.argv;

if (args[0] === 'i') {
    init(process.cwd());
} else if (args[0] === 'd') {
    devServer();
} else {
    amberpine(process.cwd());
}
