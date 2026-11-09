const fs = require('fs');

// 1. Patch config.ts
let config = fs.readFileSync('lib/auth/config.ts', 'utf8');
config = config.replace(
  `export const ADMIN_PATH = process.env.ADMIN_PATH || 'studio-vault';`,
  `export const ADMIN_PATH = process.env.ADMIN_PATH || process.env.ADMIN_VAULT_PATH || 'studio-vault';`
);
fs.writeFileSync('lib/auth/config.ts', config, 'utf8');

// 2. Patch encryption.ts
let enc = fs.readFileSync('lib/auth/encryption.ts', 'utf8');
enc = enc.replace(
  `process.env.LEADS_ENCRYPTION_KEY ||`,
  `process.env.LEADS_ENCRYPTION_KEY || process.env.ADMIN_ENCRYPTION_KEY ||`
);
fs.writeFileSync('lib/auth/encryption.ts', enc, 'utf8');

// 3. Patch password.ts
let pwd = fs.readFileSync('lib/auth/password.ts', 'utf8');
pwd = pwd.replace(
  `process.env.ADMIN_PASSWORD_PEPPER ||`,
  `process.env.ADMIN_PASSWORD_PEPPER || process.env.ADMIN_PEPPER ||`
);
fs.writeFileSync('lib/auth/password.ts', pwd, 'utf8');

// 4. Patch reauth.ts
let reauth = fs.readFileSync('lib/auth/reauth.ts', 'utf8');
reauth = reauth.replaceAll(
  `process.env.ADMIN_PASSWORD_PEPPER || 'reauth-pepper'`,
  `process.env.ADMIN_PASSWORD_PEPPER || process.env.ADMIN_PEPPER || 'reauth-pepper'`
);
fs.writeFileSync('lib/auth/reauth.ts', reauth, 'utf8');

// 5. Patch startup-guard.ts
let guard = fs.readFileSync('lib/auth/startup-guard.ts', 'utf8');
guard = guard.replace(
  `const pepper = process.env.ADMIN_PASSWORD_PEPPER;`,
  `const pepper = process.env.ADMIN_PASSWORD_PEPPER || process.env.ADMIN_PEPPER;`
);
fs.writeFileSync('lib/auth/startup-guard.ts', guard, 'utf8');

console.log('All auth env aliases successfully patched.');
