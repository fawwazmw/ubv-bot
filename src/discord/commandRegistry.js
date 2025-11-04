import { createHelpCommand } from "./commands/helpCommand.js";
import { createBirthdayCommands } from "../features/birthdays/birthdayCommands.js";
import { createBirthdayAdminCommands } from "../features/birthdays/birthdayAdminCommands.js";
import { createLevelCommands } from "../features/levels/levelCommands.js";
import { createTicketCommands } from "../features/tickets/ticketCommands.js";
import { createTicketAdminCommands } from "../features/tickets/ticketAdminCommands.js";

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
    ...createLevelCommands({
      branding: config.branding,
    }),
    ...createTicketCommands({
      branding: config.branding,
    }),
    ...createTicketAdminCommands({
      branding: config.branding,
      config,
    }),
  ];

  const registry = new Map(
    commands.map((command) => [command.definition.name, command])
  );

  return { commands, registry };
}
