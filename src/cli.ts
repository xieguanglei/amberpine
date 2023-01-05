#!/usr/bin/env node --experimental-specifier-resolution=node

import amberpine, { init } from './index';
import devServer from './dev-server';

const [, , ...args] = process.argv;

if (args[0] === 'i') {
    init(process.cwd());
} else if (args[0] === 'd') {
    devServer();
} else {
    amberpine(process.cwd());
}
