import fs from 'fs';
import path from 'path';
import { MEDIA_MANIFEST, MediaManifestEntry } from '../lib/media-manifest';

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');

function listMedia() {
  console.log('\n================ FRXCX STUDIO MEDIA INVENTORY ================');
  console.log(
    'SLOT ID'.padEnd(16) +
      'TYPE'.padEnd(8) +
      'ASPECT'.padEnd(8) +
      'STATUS'.padEnd(10) +
      'PATH'
  );
  console.log('-'.repeat(80));

  for (const [id, entry] of Object.entries(MEDIA_MANIFEST)) {
    const fullPath = path.join(publicDir, entry.filePath);
    const exists = fs.existsSync(fullPath);
    const status = !entry.active ? 'INACTIVE' : exists ? 'OK' : 'MISSING';

    console.log(
      id.padEnd(16) +
        entry.mediaType.padEnd(8) +
        entry.aspectRatio.padEnd(8) +
        status.padEnd(10) +
        entry.filePath
    );
  }
  console.log('='.repeat(80) + '\n');
}

function replaceMedia(slotId: string, newSourcePath: string) {
  if (!slotId || !newSourcePath) {
    console.error('Usage: npm run media:replace <slotId> <pathToNewFile>');
    process.exit(1);
  }

  const entry = MEDIA_MANIFEST[slotId];
  if (!entry) {
    console.error(`Error: Slot "${slotId}" does not exist in MEDIA_MANIFEST.`);
    process.exit(1);
  }

  if (!fs.existsSync(newSourcePath)) {
    console.error(`Error: Source file "${newSourcePath}" not found.`);
    process.exit(1);
  }

  const destinationPath = path.join(publicDir, entry.filePath);
  const backupDir = path.join(publicDir, 'assets', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  // Backup previous file if it exists
  if (fs.existsSync(destinationPath)) {
    const timestamp = Date.now();
    const backupFileName = `${slotId}-${timestamp}${path.extname(entry.filePath)}`;
    const backupFilePath = path.join(backupDir, backupFileName);
    fs.copyFileSync(destinationPath, backupFilePath);
    console.log(`[Backup] Saved existing file to ${path.relative(projectRoot, backupFilePath)}`);
  }

  // Copy new file into slot destination
  fs.copyFileSync(newSourcePath, destinationPath);
  console.log(`[Success] Slot "${slotId}" successfully updated with ${newSourcePath}`);
}

function printHelp() {
  console.log(`
FRXCX Studio Media Manager CLI
------------------------------
Commands:
  npm run media:list                     - Display all media slots & statuses
  npm run media:replace <slot> <newFile> - Replace asset for a slot with automatic backup
  npm run media:help                    - Display this help manual
`);
}

switch (command) {
  case 'list':
    listMedia();
    break;
  case 'replace':
    replaceMedia(arg1, arg2);
    break;
  default:
    printHelp();
    break;
}
