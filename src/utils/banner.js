import figlet from 'figlet';
import chalk from 'chalk';
import gradientString from 'gradient-string';
import boxen from 'boxen';

/**
 * Display beautiful startup banner for UBV Bot
 */
export function displayBanner() {
  console.clear(); // Clear console for clean display

  // Create ASCII art for "UBV Bot"
  const asciiArt = figlet.textSync('UBV Bot', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true
  });

  // Apply rainbow gradient to ASCII art
  const coloredAscii = gradientString.pastel.multiline(asciiArt);

  // Ornamental decorations
  const topOrnament = chalk.cyan('════════════════════════════════════════════════════════════════════════════');
  const starLine = chalk.yellow('✦ ') + chalk.magenta('★ ') + chalk.cyan('✧ ') + chalk.green('✦ ') + chalk.yellow('★ ') + chalk.blue('✧ ') + chalk.magenta('✦ ') + chalk.cyan('★ ') + chalk.yellow('✧ ') + chalk.green('★ ') + chalk.blue('✦ ') + chalk.magenta('✧ ') + chalk.cyan('★ ') + chalk.yellow('✦ ') + chalk.green('✧ ') + chalk.blue('★ ') + chalk.magenta('✦ ') + chalk.cyan('✧ ') + chalk.yellow('★ ') + chalk.green('✦');
  const bottomOrnament = chalk.cyan('════════════════════════════════════════════════════════════════════════════');

  // Bot information box
  const infoContent = [
    chalk.bold.white('🎓 Universitas Brawijaya Voice'),
    chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    chalk.green('✓ Status      : ') + chalk.bold.greenBright('ONLINE'),
    chalk.blue('✓ Version     : ') + chalk.bold.blueBright('v1.0.0'),
    chalk.magenta('✓ Framework   : ') + chalk.bold.magentaBright('Discord.js v14'),
    chalk.yellow('✓ Developer   : ') + chalk.bold.yellowBright('UBV Team'),
    chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    chalk.cyan('💡 Type /help to get started!')
  ].join('\n');

  const infoBox = boxen(infoContent, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 2, right: 2 },
    borderStyle: 'double',
    borderColor: 'cyan',
    backgroundColor: '#1a1a1a'
  });

  // Display everything
  console.log('\n');
  console.log(topOrnament);
  console.log(starLine);
  console.log('\n' + coloredAscii);
  console.log(starLine);
  console.log(bottomOrnament);
  console.log(infoBox);
  console.log('\n');
}

/**
 * Display a simple log message with timestamp and icon
 */
export function logWithStyle(icon, message, color = 'white') {
  const timestamp = chalk.gray(`[${new Date().toLocaleTimeString('id-ID')}]`);
  const styledMessage = chalk[color](message);
  console.log(`${timestamp} ${icon} ${styledMessage}`);
}

/**
 * Display success message
 */
export function logSuccess(message) {
  logWithStyle('✅', message, 'green');
}

/**
 * Display error message
 */
export function logError(message) {
  logWithStyle('❌', message, 'red');
}

/**
 * Display info message
 */
export function logInfo(message) {
  logWithStyle('ℹ️', message, 'blue');
}

/**
 * Display warning message
 */
export function logWarning(message) {
  logWithStyle('⚠️', message, 'yellow');
}
