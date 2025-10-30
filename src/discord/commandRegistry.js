import { createHelpCommand } from "./commands/helpCommand.js";
import { createBirthdayCommands } from "../features/birthdays/birthdayCommands.js";

export function buildCommandRegistry({ config }) {
  const commands = [
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
