#!/usr/bin/env node

import amberpine, { init } from './index.js';

const [, , ...args] = process.argv;

if (args[0] === 'i') {
    init(process.cwd());
} else {
    amberpine(process.cwd());
}
