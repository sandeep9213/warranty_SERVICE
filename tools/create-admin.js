// BLEAT: create the first admin without putting the password into chat or shell history.
//
// Usage (run on your own computer, from the project folder):
//   node tools/create-admin.js
//
// It asks for the admin's name, email ID and password, then writes tools/first-admin.sql.
// That file contains only a PBKDF2 hash of the password, never the password itself.
// Apply it once to the live database:
//   npx wrangler d1 execute bleat-service --remote --file=tools/first-admin.sql
// Afterwards you can delete tools/first-admin.sql. Further admins are created from the Staff accounts page.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ITERATIONS = 100000; // must match the Worker's PBKDF2 format: pbkdf2$iterations$saltB64$hashB64
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Echo nothing while the password is typed.
      rl._writeToOutput = (text) => { if (text.includes(question)) process.stdout.write(text); };
    }
    rl.question(question, (answer) => { if (hidden) process.stdout.write('\n'); rl.close(); resolve(answer.trim()); });
  });
}

(async () => {
  const name = await ask('Admin name: ');
  const email = (await ask('Admin email ID: ')).toLowerCase();
  const password = await ask('Admin password (10+ characters): ', true);
  const again = await ask('Type the password again: ', true);

  if (!name) return fail('Name is required.');
  if (!EMAIL_RE.test(email)) return fail('Enter a valid email ID.');
  if (password.length < 10) return fail('Password must be at least 10 characters.');
  if (password !== again) return fail('The two passwords do not match.');

  const sql = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const out = path.join(__dirname, 'first-admin.sql');
  fs.writeFileSync(
    out,
    `INSERT INTO admins (email, name, password_hash, created_at) VALUES (${sql(email)}, ${sql(name)}, ${sql(hashPassword(password))}, ${Date.now()});\n`,
    { mode: 0o600 }
  );
  console.log(`\nWrote ${out}`);
  console.log('Now run: npx wrangler d1 execute bleat-service --remote --file=tools/first-admin.sql');
})();

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
