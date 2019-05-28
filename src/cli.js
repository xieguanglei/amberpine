#!/usr/bin/env node

const amberpine = require('./index.js');
const devServer = require('./dev-server.js');

const [, , ...args] = process.argv;

if (args[0] === 'i') {
    amberpine.init(process.cwd());
} else if (args[0] === 'd') {
    devServer();
} else {
    amberpine(process.cwd());
}
