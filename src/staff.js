// BLEAT staff API (phase 2): admins and service engineers.
// Admin: manage staff accounts, edit/delete registrations, all complaint actions.
// Engineer: register products, edit registrations and complaints, comment, close, reopen.

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.isHttpError = true;
  }
}

import { translateText } from './translate.js';
const STAFF_COOKIE = 'bstaff';
const STAFF_TTL_MS = 12 * 3600 * 1000;
const STAFF_TTL_S = 12 * 3600;
const PBKDF2_ITER = 100000;
const DEALER_OPTION = 'Offline Dealer';
const PORTAL_OPTION = 'Other Online Portal';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const STATUSES = ['pending_engineer', 'pending_buyer', 'closed'];
const STATUS_LABELS = {
  pending_engineer: 'Under review by our service team',
  pending_buyer: 'Waiting for your reply',
  closed: 'Closed',
};
const REG_SORT = {
  buyer: 'u.full_name',
  phone: 'p.reg_phone',
  category: 'p.category',
  model: 'p.model_name',
  registered: 'p.created_at',
  date: 'p.purchase_date',
  place: 'p.place_of_purchase',
};

const now = () => Date.now();
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const validPhone = (p) => /^\d{10}$/.test(p);
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Invalid request body.');
  }
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- Passwords (PBKDF2-SHA256; format: pbkdf2$iterations$saltB64$hashB64) ----------

function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, PBKDF2_ITER))}`;
}
async function verifyPassword(password, stored) {
  const [alg, iter, saltB64, hashB64] = String(stored || '').split('$');
  if (alg !== 'pbkdf2' || !iter || !saltB64 || !hashB64) return false;
  const computed = await pbkdf2(password, unb64(saltB64), Number(iter));
  const expected = unb64(hashB64);
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ expected[i];
  return diff === 0;
}

// ---------- Sessions and roles ----------

function staffCookie(value, maxAge) {
  return `${STAFF_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function staffToken(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${STAFF_COOKIE}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}

async function currentStaff(request, env, roles = ['admin', 'engineer']) {
  const token = staffToken(request);
  if (!token) throw new HttpError(401, 'Please sign in.');
  const s = await env.DB.prepare('SELECT role, actor_id FROM staff_sessions WHERE id = ? AND expires_at > ?')
    .bind(await sha256Hex(token), now())
    .first();
  if (!s) throw new HttpError(401, 'Please sign in.');
  if (!roles.includes(s.role)) throw new HttpError(403, 'You do not have access to this action.');
  const row =
    s.role === 'admin'
      ? await env.DB.prepare('SELECT id, name FROM admins WHERE id = ?').bind(s.actor_id).first()
      : await env.DB.prepare('SELECT id, name FROM service_engineers WHERE id = ? AND active = 1').bind(s.actor_id).first();
  if (!row) throw new HttpError(401, 'Please sign in.');
  return { role: s.role, id: row.id, name: row.name };
}

async function audit(env, staff, action, entity, entityId, details, reason) {
  await env.DB.prepare(
    'INSERT INTO audit_log (actor_type, actor_id, action, entity, entity_id, details, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(staff.role, staff.id, action, entity, entityId ?? null, details ? JSON.stringify(details) : null, reason || null, now())
    .run();
}

function requireReason(b) {
  const reason = clean(b.reason, 300);
  if (reason.length < 5) {
    throw new HttpError(422, 'Please enter a reason (at least 5 characters).', { reason: 'Reason is required.' });
  }
  return reason;
}

// ---------- Auth ----------

// Failed sign-ins are counted per account and per IP. Too many in a row locks that key for 15 minutes.
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_LIMITS = { account: 5, ip: 20 };
let dummyHash = null;

async function loginLocked(env, key) {
  const row = await env.DB.prepare('SELECT locked_until FROM login_attempts WHERE key = ?').bind(key).first();
  return !!row && row.locked_until > now();
}

async function recordLoginFailure(env, key, max) {
  const t = now();
  await env.DB.prepare(
    'INSERT INTO login_attempts (key, fails, locked_until, updated_at) VALUES (?, 1, 0, ?) ON CONFLICT(key) DO UPDATE SET fails = fails + 1, updated_at = excluded.updated_at'
  )
    .bind(key, t)
    .run();
  await env.DB.prepare('UPDATE login_attempts SET locked_until = ?, fails = 0 WHERE key = ? AND fails >= ?')
    .bind(t + LOGIN_LOCK_MS, key, max)
    .run();
}

async function login(request, env) {
  const b = await readJson(request);
  const role = b.role === 'admin' ? 'admin' : 'engineer';
  const login = clean(b.login, 120).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const acctKey = `account:${role}:${login}`;
  const ipKey = `ip:${ip}`;

  if ((await loginLocked(env, acctKey)) || (await loginLocked(env, ipKey))) {
    throw new HttpError(429, 'Too many failed attempts. Please try again in 15 minutes.');
  }

  const row =
    role === 'admin'
      ? await env.DB.prepare('SELECT id, password_hash FROM admins WHERE email = ?').bind(login).first()
      : await env.DB.prepare('SELECT id, password_hash FROM service_engineers WHERE username = ? AND active = 1').bind(login).first();

  // Always hash, so a missing account takes as long to answer as a wrong password.
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password-' + randomToken());
  const ok = row ? await verifyPassword(password, row.password_hash) : (await verifyPassword(password, dummyHash), false);

  if (!ok) {
    await recordLoginFailure(env, acctKey, LOGIN_LIMITS.account);
    await recordLoginFailure(env, ipKey, LOGIN_LIMITS.ip);
    throw new HttpError(401, 'Invalid login or password.');
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(acctKey).run();

  const token = randomToken();
  const t = now();
  await env.DB.prepare('INSERT INTO staff_sessions (id, role, actor_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(token), role, row.id, t, t + STAFF_TTL_MS)
    .run();
  return json({ ok: true, role }, 200, { 'set-cookie': staffCookie(token, STAFF_TTL_S) });
}

async function logout(request, env) {
  const token = staffToken(request);
  if (token) await env.DB.prepare('DELETE FROM staff_sessions WHERE id = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': staffCookie('', 0) });
}

async function me(request, env) {
  const s = await currentStaff(request, env);
  return json({ role: s.role, name: s.name });
}

// ---------- Staff accounts (admin only) ----------

async function listAccounts(request, env) {
  await currentStaff(request, env, ['admin']);
  const { results } = await env.DB.prepare(
    `SELECT 'engineer' AS kind, id, name, username AS login, active FROM service_engineers
     UNION ALL SELECT 'admin' AS kind, id, name, email AS login, 1 AS active FROM admins
     ORDER BY kind, name`
  ).all();
  return json({ accounts: results });
}

async function createAccount(request, env) {
  const staff = await currentStaff(request, env, ['admin']);
  const b = await readJson(request);
  const kind = b.kind === 'admin' ? 'admin' : 'engineer';
  const name = clean(b.name, 100);
  const login = clean(b.login, 120).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';

  const e = {};
  if (!name) e.name = 'Name is required.';
  if (kind === 'engineer' && !USERNAME_RE.test(login)) e.login = 'Username: 3-32 letters, numbers, dot, dash or underscore.';
  if (kind === 'admin' && !EMAIL_RE.test(login)) e.login = 'Enter a valid email ID.';
  if (password.length < 10) e.password = 'Password must be at least 10 characters.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  const hash = await hashPassword(password);
  try {
    const res =
      kind === 'engineer'
        ? await env.DB.prepare('INSERT INTO service_engineers (username, name, password_hash, active, created_at) VALUES (?, ?, ?, 1, ?)')
            .bind(login, name, hash, now()).run()
        : await env.DB.prepare('INSERT INTO admins (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
            .bind(login, name, hash, now()).run();
    await audit(env, staff, 'create', kind === 'engineer' ? 'service_engineer' : 'admin', res.meta.last_row_id, { name, login }, 'Staff account created');
    return json({ id: res.meta.last_row_id }, 201);
  } catch (err) {
    if (String(err).includes('UNIQUE')) throw new HttpError(409, 'That username or email is already in use.', { login: 'Already in use.' });
    throw err;
  }
}

// ---------- Product fields (shared by create and edit) ----------

async function optionExists(env, list, value) {
  const r = await env.DB.prepare('SELECT 1 FROM dropdown_options WHERE list_key = ? AND value = ? AND active = 1').bind(list, value).first();
  return !!r;
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== s) return false;
  return s <= new Date().toISOString().slice(0, 10);
}

async function productInput(env, b) {
  const p = {
    category: clean(b.category, 60),
    model_name: clean(b.model_name, 100),
    purchase_date: clean(b.purchase_date, 10),
    place_of_purchase: clean(b.place_of_purchase, 60),
    dealer_name: clean(b.dealer_name, 120),
    order_no: clean(b.order_no, 60),
    serial_no: clean(b.serial_no, 64),
    reg_email: clean(b.reg_email, 254).toLowerCase(),
    reg_phone: clean(b.reg_phone, 20),
  };
  const e = {};
  if (!(await optionExists(env, 'product_category', p.category))) e.category = 'Choose a product category.';
  if (!p.model_name) e.model_name = 'Model name is required.';
  if (!validDate(p.purchase_date)) e.purchase_date = 'Enter a valid purchase date (not in the future).';
  if (!(await optionExists(env, 'place_of_purchase', p.place_of_purchase))) e.place_of_purchase = 'Choose a place of purchase.';
  if (p.place_of_purchase === DEALER_OPTION) {
    if (!p.dealer_name) e.dealer_name = 'Enter the dealer name.';
    p.order_no = null;
  } else if (p.place_of_purchase === PORTAL_OPTION) {
    if (!p.dealer_name) e.dealer_name = 'Enter the portal name and details.';
    if (!p.order_no) e.order_no = 'Enter the order number.';
  } else {
    p.dealer_name = null;
    if (!p.order_no) e.order_no = 'Enter the order number.';
  }
  if (!p.serial_no) e.serial_no = 'Serial number is required.';
  if (!EMAIL_RE.test(p.reg_email)) e.reg_email = 'Enter a valid email ID.';
  if (!validPhone(p.reg_phone)) e.reg_phone = 'Enter a 10-digit mobile number without +91.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);
  return p;
}

function snapshotProduct(p) {
  return {
    category: p.category,
    model_name: p.model_name,
    purchase_date: p.purchase_date,
    place_of_purchase: p.place_of_purchase,
    dealer_name: p.dealer_name ?? null,
    order_no: p.order_no ?? null,
    serial_no: p.serial_no,
    reg_email: p.reg_email,
    reg_phone: p.reg_phone,
  };
}

function serialConflict(err) {
  if (String(err).includes('UNIQUE')) {
    return new HttpError(409, 'This serial number is already registered.', { serial_no: 'Already registered.' });
  }
  return err;
}

// ---------- Registrations ----------

async function listRegistrations(request, env) {
  await currentStaff(request, env);
  const q = new URL(request.url).searchParams;
  const where = [];
  const binds = [];

  const name = clean(q.get('name') || '', 100);
  if (name) {
    where.push('u.full_name LIKE ?');
    binds.push(`%${name}%`);
  }
  const phone = clean(q.get('phone') || '', 20);
  if (phone) {
    where.push('p.reg_phone LIKE ?');
    binds.push(`%${phone}%`);
  }
  const product = clean(q.get('product') || '', 100);
  if (product) {
    where.push('(p.model_name LIKE ? OR p.category LIKE ?)');
    binds.push(`%${product}%`, `%${product}%`);
  }

  // Registration date range, as Indian calendar days (+05:30).
  const from = q.get('from') || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    where.push('p.created_at >= ?');
    binds.push(Date.parse(`${from}T00:00:00+05:30`));
  }
  const to = q.get('to') || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    where.push('p.created_at <= ?');
    binds.push(Date.parse(`${to}T23:59:59.999+05:30`));
  }

  const sortCol = REG_SORT[q.get('sort')] || 'p.created_at';
  const dir = q.get('dir') === 'asc' ? 'ASC' : 'DESC';
  const size = [10, 20, 50, 100].includes(Number(q.get('size'))) ? Number(q.get('size')) : 10;
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM products p JOIN users u ON u.id = p.user_id ${whereSql}`)
    .bind(...binds)
    .first();
  const total = Number(count?.n || 0);
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, parseInt(q.get('page') || '1', 10) || 1), pages);

  const sql = `SELECT p.id, u.full_name AS buyer_name, p.reg_phone AS phone, p.category, p.model_name,
      p.purchase_date, p.place_of_purchase, p.dealer_name, p.order_no, p.serial_no, p.reg_email, p.created_at AS registered_at, u.id AS user_id,
      (SELECT COUNT(*) FROM product_bills b WHERE b.product_id = p.id) AS has_bill
    FROM products p JOIN users u ON u.id = p.user_id
    ${whereSql}
    ORDER BY ${sortCol} ${dir}, p.id DESC LIMIT ? OFFSET ?`;
  const { results } = await env.DB.prepare(sql)
    .bind(...binds, size, (page - 1) * size)
    .all();
  return json({ registrations: results, total, page, pages, size });
}

async function findOrCreateBuyer(env, { name, email, phone }) {
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR google_email = ? ORDER BY id LIMIT 1')
    .bind(email, email)
    .first();
  if (existing) return existing.id;
  const t = now();
  // Buyers registered by staff have no Google login yet; a placeholder key keeps the row unique.
  const res = await env.DB.prepare(
    'INSERT INTO users (google_sub, google_email, full_name, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind('manual:' + randomToken(), email, name, email, phone, t, t)
    .run();
  return res.meta.last_row_id;
}

async function createRegistration(request, env, ctx) {
  const staff = await currentStaff(request, env);
  const b = await readJson(request);

  const buyerName = clean(b.buyer_name, 100);
  const buyerEmail = clean(b.buyer_email, 254).toLowerCase();
  const buyerPhone = clean(b.buyer_phone, 20);
  const e = {};
  if (!buyerName) e.buyer_name = 'Buyer name is required.';
  if (!EMAIL_RE.test(buyerEmail)) e.buyer_email = 'Enter a valid buyer email ID.';
  if (!validPhone(buyerPhone)) e.buyer_phone = 'Enter a 10-digit buyer mobile number without +91.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  const p = await productInput(env, b);
  const userId = await findOrCreateBuyer(env, { name: buyerName, email: buyerEmail, phone: buyerPhone });

  let id;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO products (user_id, category, model_name, purchase_date, place_of_purchase, dealer_name, order_no,
         serial_no, serial_norm, reg_email, reg_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, p.category, p.model_name, p.purchase_date, p.place_of_purchase, p.dealer_name, p.order_no,
        p.serial_no, p.serial_no.toUpperCase(), p.reg_email, p.reg_phone, now())
      .run();
    id = res.meta.last_row_id;
  } catch (err) {
    throw serialConflict(err);
  }

  await audit(env, staff, 'create', 'product', id, { buyer: buyerName, product: snapshotProduct(p) },
    clean(b.reason, 300) || 'Registered by staff for customer');

  ctx.waitUntil(
    sendRegistrationEmail(env, {
      to: p.reg_email,
      name: buyerName,
      category: p.category,
      model: p.model_name,
    })
  );
  return json({ id }, 201);
}

// Full details of one registration, for the View Registration page (staff only).
async function getRegistration(request, env, id) {
  await currentStaff(request, env);
  const r = await env.DB.prepare(
    `SELECT p.id, p.category, p.model_name, p.purchase_date, p.place_of_purchase, p.dealer_name, p.order_no, p.serial_no,
       p.reg_email, p.reg_phone, p.created_at AS registered_at,
       (SELECT COUNT(*) FROM product_bills b WHERE b.product_id = p.id) AS has_bill,
       u.full_name, u.email AS buyer_email, u.phone AS buyer_phone, u.address_line1, u.address_line2,
       u.city, u.state, u.country, u.postal_code, u.google_email
     FROM products p JOIN users u ON u.id = p.user_id WHERE p.id = ?`
  )
    .bind(id)
    .first();
  if (!r) throw new HttpError(404, 'Registration not found.');
  return json({ registration: r });
}

async function updateRegistration(request, env, id) {
  const staff = await currentStaff(request, env);
  const b = await readJson(request);
  const reason = requireReason(b);

  const before = await env.DB.prepare('SELECT p.*, u.full_name AS buyer_name FROM products p JOIN users u ON u.id = p.user_id WHERE p.id = ?')
    .bind(id)
    .first();
  if (!before) throw new HttpError(404, 'Registration not found.');

  const buyerName = clean(b.buyer_name, 100);
  if (!buyerName) throw new HttpError(422, 'Please fix the highlighted fields.', { buyer_name: 'Buyer name is required.' });
  const p = await productInput(env, b);

  try {
    await env.DB.prepare(
      `UPDATE products SET category = ?, model_name = ?, purchase_date = ?, place_of_purchase = ?, dealer_name = ?,
         order_no = ?, serial_no = ?, serial_norm = ?, reg_email = ?, reg_phone = ? WHERE id = ?`
    )
      .bind(p.category, p.model_name, p.purchase_date, p.place_of_purchase, p.dealer_name, p.order_no,
        p.serial_no, p.serial_no.toUpperCase(), p.reg_email, p.reg_phone, id)
      .run();
  } catch (err) {
    throw serialConflict(err);
  }
  await env.DB.prepare('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?').bind(buyerName, now(), before.user_id).run();

  await audit(env, staff, 'update', 'product', id,
    { before: { buyer_name: before.buyer_name, ...snapshotProduct(before) }, after: { buyer_name: buyerName, ...snapshotProduct(p) } },
    reason);
  return json({ ok: true });
}

async function deleteRegistration(request, env, id) {
  const staff = await currentStaff(request, env, ['admin']);
  const b = await readJson(request);
  const reason = requireReason(b);

  const before = await env.DB.prepare('SELECT p.*, u.full_name AS buyer_name FROM products p JOIN users u ON u.id = p.user_id WHERE p.id = ?')
    .bind(id)
    .first();
  if (!before) throw new HttpError(404, 'Registration not found.');

  const t = await env.DB.prepare('SELECT COUNT(*) AS n FROM tickets WHERE product_id = ?').bind(id).first();
  if (t.n > 0) {
    throw new HttpError(409, 'This product has service requests, so it cannot be deleted. Close them first.');
  }

  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  await audit(env, staff, 'delete', 'product', id, { buyer_name: before.buyer_name, ...snapshotProduct(before) }, reason);
  return json({ ok: true });
}

// ---------- Complaints (service requests) ----------

async function listTickets(request, env) {
  await currentStaff(request, env);
  const status = new URL(request.url).searchParams.get('status') || '';
  const filter = STATUSES.includes(status) ? status : null;
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.ticket_no, t.status, t.created_at, t.updated_at, t.closed_at,
       u.full_name AS buyer_name, p.category, p.model_name
     FROM tickets t JOIN users u ON u.id = t.user_id JOIN products p ON p.id = t.product_id
     WHERE (? IS NULL OR t.status = ?)
     ORDER BY t.updated_at DESC LIMIT 300`
  )
    .bind(filter, filter)
    .all();
  return json({ tickets: results });
}

async function getTicket(request, env, id) {
  await currentStaff(request, env);
  const t = await env.DB.prepare(
    `SELECT t.*, u.full_name AS buyer_name, u.phone AS buyer_phone, p.category, p.model_name, p.serial_no
     FROM tickets t JOIN users u ON u.id = t.user_id JOIN products p ON p.id = t.product_id WHERE t.id = ?`
  )
    .bind(id)
    .first();
  if (!t) throw new HttpError(404, 'Complaint not found.');

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.author_type, c.body, c.body_en, c.created_at,
       CASE c.author_type
         WHEN 'admin' THEN (SELECT name FROM admins WHERE id = c.author_id)
         WHEN 'engineer' THEN (SELECT name FROM service_engineers WHERE id = c.author_id)
         ELSE 'Buyer' END AS author_name
     FROM ticket_comments c WHERE c.ticket_id = ? ORDER BY c.created_at ASC, c.id ASC`
  )
    .bind(id)
    .all();
  // The service team always reads English: the English copy of buyer text, or text as written by staff.
  const ticket = { ...t, issue_text: t.issue_en ?? t.issue_text };
  delete ticket.issue_en;
  delete ticket.issue_lang;
  const comments = results.map((c) => ({ ...c, body: c.body_en ?? c.body }));
  return json({ ticket, comments });
}

async function updateTicket(request, env, id) {
  const staff = await currentStaff(request, env);
  const b = await readJson(request);
  const reason = requireReason(b);

  const before = await env.DB.prepare('SELECT issue_text, whatsapp, contact_email FROM tickets WHERE id = ?').bind(id).first();
  if (!before) throw new HttpError(404, 'Complaint not found.');

  const issue = clean(b.issue_text, 2000);
  const whatsapp = clean(b.whatsapp, 20);
  const contact = clean(b.contact_email, 254).toLowerCase();
  const e = {};
  if (issue.length < 10) e.issue_text = 'Describe the issue in at least 10 characters.';
  if (!validPhone(whatsapp)) e.whatsapp = 'Enter a 10-digit WhatsApp number without +91.';
  if (!EMAIL_RE.test(contact)) e.contact_email = 'Enter a valid email ID.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  // Staff text is English. It replaces the buyer's text, so cached translations of it are stale.
  await env.DB.prepare("UPDATE tickets SET issue_text = ?, issue_en = ?, issue_lang = 'en', whatsapp = ?, contact_email = ?, updated_at = ? WHERE id = ?")
    .bind(issue, issue, whatsapp, contact, now(), id)
    .run();
  await env.DB.prepare('DELETE FROM translations WHERE ref = ?').bind('t:' + id).run();
  await audit(env, staff, 'update', 'ticket', id, { before, after: { issue_text: issue, whatsapp, contact_email: contact } }, reason);
  return json({ ok: true });
}

async function sendCommentEmail(env, payload) {
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, template: 'comment', ...payload }),
    });
    const out = await r.json().catch(() => ({}));
    if (!(r.ok && out.ok)) console.error('Comment email failed', payload.ticket_no, out.error || r.status);
  } catch (err) {
    console.error('Comment email error', payload.ticket_no, err);
  }
}

async function sendRegistrationEmail(env, payload) {
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, template: 'registration', ...payload }),
    });
    const out = await r.json().catch(() => ({}));
    if (!(r.ok && out.ok)) console.error('Registration email failed', out.error || r.status);
  } catch (err) {
    console.error('Registration email error', err);
  }
}

async function addComment(request, env, ctx, id) {
  const staff = await currentStaff(request, env);
  const b = await readJson(request);
  const body = clean(b.body, 2000);
  const next = b.next_status;
  const e = {};
  if (body.length < 2) e.body = 'Write a comment.';
  if (!STATUSES.includes(next)) e.next_status = 'Choose a status.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  const t = await env.DB.prepare('SELECT id, ticket_no, status, contact_email FROM tickets WHERE id = ?').bind(id).first();
  if (!t) throw new HttpError(404, 'Complaint not found.');
  if (t.status === 'closed') throw new HttpError(409, 'This complaint is closed. Reopen it first.');

  const ts = now();
  await env.DB.prepare('INSERT INTO ticket_comments (ticket_id, author_type, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, staff.role, staff.id, body, ts)
    .run();
  await env.DB.prepare('UPDATE tickets SET status = ?, updated_at = ?, closed_at = ? WHERE id = ?')
    .bind(next, ts, next === 'closed' ? ts : null, id)
    .run();

  // The buyer's email is in the buyer's language. If translation fails, it goes out in English.
  const buyer = await env.DB.prepare('SELECT u.lang FROM users u JOIN tickets tk ON tk.user_id = u.id WHERE tk.id = ?').bind(id).first();
  const buyerText = (await translateText(env, body, 'en', buyer?.lang || 'en')) ?? body;
  ctx.waitUntil(
    sendCommentEmail(env, {
      to: t.contact_email,
      ticket_no: t.ticket_no,
      body: buyerText,
      status_label: STATUS_LABELS[next],
      needs_reply: next === 'pending_buyer',
    })
  );
  return json({ ok: true }, 201);
}

async function reopenTicket(request, env, ctx, id) {
  const staff = await currentStaff(request, env);
  const b = await readJson(request);
  const reason = requireReason(b);

  const t = await env.DB.prepare('SELECT status, ticket_no, contact_email FROM tickets WHERE id = ?').bind(id).first();
  if (!t) throw new HttpError(404, 'Complaint not found.');
  if (t.status !== 'closed') throw new HttpError(409, 'This complaint is already open.');

  const ts = now();
  const text = `Complaint reopened: ${reason}`;
  await env.DB.prepare('UPDATE tickets SET status = ?, updated_at = ?, closed_at = NULL WHERE id = ?')
    .bind('pending_engineer', ts, id)
    .run();
  await env.DB.prepare('INSERT INTO ticket_comments (ticket_id, author_type, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, staff.role, staff.id, text, ts)
    .run();
  await audit(env, staff, 'reopen', 'ticket', id, null, reason);

  ctx.waitUntil(
    sendCommentEmail(env, {
      to: t.contact_email,
      ticket_no: t.ticket_no,
      body: text,
      status_label: STATUS_LABELS.pending_engineer,
      needs_reply: false,
    })
  );
  return json({ ok: true });
}

// ---------- Router ----------

// Bill photo copy of a registration. Staff only; every view is written to the audit log.
async function getRegistrationBill(request, env, id) {
  const staff = await currentStaff(request, env);
  const row = await env.DB.prepare('SELECT mime, data FROM product_bills WHERE product_id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'Bill photo not found.');
  await audit(env, staff, 'view_bill', 'product', id, null, null);
  const bytes = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: { 'content-type': row.mime, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' },
  });
}

export async function handleStaff(request, env, ctx, url) {
  const p = url.pathname;
  const m = request.method;
  if (!p.startsWith('/api/staff')) return null;

  if (m === 'POST' && p === '/api/staff/login') return login(request, env);
  if (m === 'POST' && p === '/api/staff/logout') return logout(request, env);
  if (m === 'GET' && p === '/api/staff/me') return me(request, env);

  if (p === '/api/staff/accounts') {
    if (m === 'GET') return listAccounts(request, env);
    if (m === 'POST') return createAccount(request, env);
  }

  if (p === '/api/staff/registrations') {
    if (m === 'GET') return listRegistrations(request, env);
    if (m === 'POST') return createRegistration(request, env, ctx);
  }
  const billMatch = p.match(/^\/api\/staff\/registrations\/(\d+)\/bill$/);
  if (m === 'GET' && billMatch) return getRegistrationBill(request, env, Number(billMatch[1]));
  let r = p.match(/^\/api\/staff\/registrations\/(\d+)$/);
  if (r) {
    if (m === 'GET') return getRegistration(request, env, Number(r[1]));
    if (m === 'PUT') return updateRegistration(request, env, Number(r[1]));
    if (m === 'DELETE') return deleteRegistration(request, env, Number(r[1]));
  }

  if (p === '/api/staff/tickets' && m === 'GET') return listTickets(request, env);
  r = p.match(/^\/api\/staff\/tickets\/(\d+)$/);
  if (r) {
    if (m === 'GET') return getTicket(request, env, Number(r[1]));
    if (m === 'PUT') return updateTicket(request, env, Number(r[1]));
  }
  r = p.match(/^\/api\/staff\/tickets\/(\d+)\/(comments|reopen)$/);
  if (r && m === 'POST') {
    const id = Number(r[1]);
    if (r[2] === 'comments') return addComment(request, env, ctx, id);
    return reopenTicket(request, env, ctx, id);
  }

  return json({ error: 'Not found.' }, 404);
}
