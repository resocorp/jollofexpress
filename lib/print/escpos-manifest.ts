/**
 * ESC/POS generator for delivery manifests
 * Generates raw ESC/POS commands from plain text manifest
 */

// ESC/POS Command Constants
const ESC = '\x1B';
const GS = '\x1D';
const CUT = GS + 'V' + '\x00';
const CHAR_SET_USA = ESC + 'R' + '\x00';
const NORMAL = ESC + '!' + '\x00';
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const ALIGN_LEFT = ESC + 'a' + '\x00';

/**
 * Generate ESC/POS commands from plain text manifest
 */
export function generateManifestESCPOS(text: string): Buffer {
  const commands: string[] = [];

  // Initialize printer
  commands.push(ESC + '@');
  commands.push(CHAR_SET_USA);
  commands.push(NORMAL);
  commands.push(ALIGN_LEFT);

  // Process each line
  const lines = text.split('\n');
  for (const line of lines) {
    // Bold for headers and stop lines
    if (
      line.startsWith('DELIVERY MANIFEST') ||
      line.startsWith('STOP ') ||
      line.includes('COD COLLECTION') ||
      line.includes('TOTAL COD')
    ) {
      commands.push(BOLD_ON);
      commands.push(line + '\n');
      commands.push(BOLD_OFF);
    } else {
      commands.push(line + '\n');
    }
  }

  // Feed and cut
  commands.push('\n\n\n');
  commands.push(CUT);

  return Buffer.from(commands.join(''), 'binary');
}
