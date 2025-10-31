import { buildCommandRegistry } from './src/discord/commandRegistry.js';
import { config } from './src/config/env.js';

const { commands } = buildCommandRegistry({ config });
console.log('📋 Total commands:', commands.length);
commands.forEach(cmd => console.log('  -', cmd.definition.name));
