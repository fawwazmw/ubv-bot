import { createHelpCommand } from "./commands/helpCommand.js";
import { createStatusCommand } from "./commands/statusCommand.js";
import { createBirthdayCommands } from "../features/birthdays/birthdayCommands.js";

export function buildCommandRegistry({ config, statusManager }) {
  const commands = [
    createStatusCommand({ statusManager }),
    createHelpCommand({
      branding: config.branding,
      discord: config.discord,
    }),
    ...createBirthdayCommands({
      filePath: config.paths.birthdays,
      branding: config.branding,
      discord: config.discord,
    }),
  ];

  const registry = new Map(
    commands.map((command) => [command.definition.name, command])
  );

  return { commands, registry };
}
