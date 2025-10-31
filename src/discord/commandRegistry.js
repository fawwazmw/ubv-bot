import { createHelpCommand } from "./commands/helpCommand.js";
import { createBirthdayCommands } from "../features/birthdays/birthdayCommands.js";
import { createBirthdayAdminCommands } from "../features/birthdays/birthdayAdminCommands.js";

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
    ...createBirthdayAdminCommands({
      config,
    }),
  ];

  const registry = new Map(
    commands.map((command) => [command.definition.name, command])
  );

  return { commands, registry };
}
