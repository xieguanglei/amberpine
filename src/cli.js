#!/usr/bin/env node

const amberpine = require('./index.js');

const [, , ...args] = process.argv;

if (args[0] === 'init') {
    amberpine.init(process.cwd());
} else {
    amberpine(process.cwd());
}
