// BLEAT Service & Warranty Portal — buyer API (Cloudflare Worker + D1)
import { handleStaff } from './staff.js';
import { translateText, viewText, LANGS } from './translate.js';
// Phase 1: buyer signup (Google), profile, product registration, service tickets.

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days
const SESSION_TTL_S = 30 * 24 * 3600;
const COOKIE_NAME = 'bsid';
const PROFILE_FIELDS = ['full_name', 'email', 'phone', 'address_line1', 'city', 'state', 'country', 'postal_code'];
const DROPDOWN_LISTS = ['product_category', 'place_of_purchase'];
const DEALER_OPTION = 'Offline Dealer';
const PORTAL_OPTION = 'Other Online Portal';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

const now = () => Date.now();

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const validPhone = (p) => /^\d{10}$/.test(p);

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

function corsHeaders(env, request) {
  const origin = request.headers.get('origin');
  if (origin && origin === env.FRONTEND_ORIGIN) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      vary: 'origin',
    };
  }
  return {};
}

function sessionCookie(value, maxAgeSeconds) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function getSessionToken(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}

async function getSessionUserId(request, env) {
  const token = getSessionToken(request);
  if (!token) return null;
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(await sha256Hex(token), now())
    .first();
  return row ? row.user_id : null;
}

async function requireUserId(request, env) {
  const userId = await getSessionUserId(request, env);
  if (!userId) throw new HttpError(401, 'Please sign in to continue.');
  return userId;
}

function isProfileComplete(u) {
  return !!u && !!u.consent_at && PROFILE_FIELDS.every((k) => u[k] && String(u[k]).trim());
}

async function requireCompleteProfile(env, userId) {
  const u = await env.DB.prepare(`SELECT full_name, email, phone, address_line1, city, state, country, postal_code, consent_at FROM users WHERE id = ?`)
    .bind(userId)
    .first();
  if (!isProfileComplete(u)) throw new HttpError(403, 'Please complete your details before continuing.');
  return u;
}

async function optionExists(env, list, value) {
  const r = await env.DB.prepare('SELECT 1 FROM dropdown_options WHERE list_key = ? AND value = ? AND active = 1')
    .bind(list, value)
    .first();
  return !!r;
}

// ---------- Auth ----------

async function loginWithGoogle(request, env) {
  const body = await readJson(request);
  if (typeof body.credential !== 'string' || !body.credential) {
    throw new HttpError(400, 'Missing Google sign-in token.');
  }

  // Verify the ID token with Google (checks signature, expiry and audience).
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(body.credential));
  if (!r.ok) throw new HttpError(401, 'Google sign-in could not be verified.');
  const info = await r.json();

  const audOk = info.aud === env.GOOGLE_CLIENT_ID;
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  const verified = info.email_verified === true || info.email_verified === 'true';
  if (!audOk || !issOk || !verified || !info.sub || !info.email) {
    throw new HttpError(401, 'Google sign-in could not be verified.');
  }

  const googleEmail = String(info.email).toLowerCase();
  const t = now();

  const bySub = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(info.sub).first();
  if (bySub) {
    // Returning buyer: refresh the Google email.
    await env.DB.prepare('UPDATE users SET google_email = ?, updated_at = ? WHERE id = ?').bind(googleEmail, t, bySub.id).run();
  } else {
    // An account created by staff or by migration has a placeholder login key and the email the staff entered.
    // A verified Google email with that same address claims it, so the buyer keeps their registrations.
    const claimed = await env.DB.prepare(
      "SELECT id FROM users WHERE google_email = ? AND google_sub LIKE 'manual:%' ORDER BY id LIMIT 1"
    ).bind(googleEmail).first();
    if (claimed) {
      await env.DB.prepare('UPDATE users SET google_sub = ?, google_email = ?, updated_at = ? WHERE id = ?')
        .bind(info.sub, googleEmail, t, claimed.id).run();
    } else {
      // New buyer: prefill name and contact email from Google.
      await env.DB.prepare('INSERT INTO users (google_sub, google_email, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(info.sub, googleEmail, info.name || '', googleEmail, t, t).run();
    }
  }

  const user = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(info.sub).first();

  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), user.id, t, t + SESSION_TTL_MS)
    .run();

  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, SESSION_TTL_S) });
}

// ---------- WhatsApp OTP sign-in ----------

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_TRIES = 5;
const OTP_PHONE_PER_10MIN = 3;
const OTP_IP_PER_HOUR = 10;

function normaliseIndianMobile(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return validPhone(d) ? d : null;
}

async function otpHash(env, phone, code) {
  if (!env.OTP_PEPPER) throw new HttpError(500, 'Sign-in by WhatsApp is not configured.');
  return sha256Hex(`${phone}:${code}:${env.OTP_PEPPER}`);
}

// Sends the code with a WhatsApp authentication template (body parameter plus copy-code button).
async function sendWhatsAppOtp(env, phone, code) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_OTP_TEMPLATE) {
    throw new HttpError(500, 'Sign-in by WhatsApp is not configured.');
  }
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: '91' + phone,
      type: 'template',
      template: {
        name: env.WHATSAPP_OTP_TEMPLATE,
        language: { code: env.WHATSAPP_OTP_LANG || 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'otp', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (!r.ok) {
    // Log the status only; never log the phone number or the code.
    console.log('whatsapp otp send failed, status', r.status);
    throw new HttpError(502, 'We could not send the code on WhatsApp. Please try again.');
  }
}

async function sendOtp(request, env) {
  const body = await readJson(request);
  const phone = normaliseIndianMobile(body.phone);
  if (!phone) throw new HttpError(422, 'Please check the details.', { phone: 'Enter a 10-digit mobile number without +91.' });

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const t = now();
  const recentPhone = await env.DB.prepare('SELECT COUNT(*) AS n FROM otp_codes WHERE phone = ? AND created_at > ?')
    .bind(phone, t - 10 * 60 * 1000).first();
  const recentIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM otp_codes WHERE ip = ? AND created_at > ?')
    .bind(ip, t - 60 * 60 * 1000).first();
  if (Number(recentPhone.n) >= OTP_PHONE_PER_10MIN || Number(recentIp.n) >= OTP_IP_PER_HOUR) {
    throw new HttpError(429, 'Too many codes requested. Please wait a few minutes and try again.');
  }

  const rnd = new Uint32Array(1);
  crypto.getRandomValues(rnd);
  const code = String(rnd[0] % 1000000).padStart(6, '0');
  const hash = await otpHash(env, phone, code);
  await env.DB.prepare('INSERT INTO otp_codes (phone, code_hash, attempts, expires_at, created_at, ip) VALUES (?, ?, 0, ?, ?, ?)')
    .bind(phone, hash, t + OTP_TTL_MS, t, ip)
    .run();
  await sendWhatsAppOtp(env, phone, code);
  return json({ ok: true, expires_in: OTP_TTL_MS / 1000 });
}

async function startSession(env, userId) {
  const token = randomToken();
  const t = now();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, t, t + SESSION_TTL_MS)
    .run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, SESSION_TTL_S) });
}

async function verifyOtp(request, env) {
  const body = await readJson(request);
  const phone = normaliseIndianMobile(body.phone);
  const code = String(body.code || '').replace(/\s/g, '');
  if (!phone || !/^\d{6}$/.test(code)) {
    throw new HttpError(422, 'Please check the details.', { code: 'Enter the 6-digit code.' });
  }

  const t = now();
  const row = await env.DB.prepare(
    'SELECT id, code_hash, attempts, expires_at FROM otp_codes WHERE phone = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1'
  ).bind(phone).first();
  if (!row || row.expires_at <= t) throw new HttpError(401, 'This code has expired. Please request a new one.');
  if (row.attempts >= OTP_MAX_TRIES) throw new HttpError(429, 'Too many wrong codes. Please request a new one.');

  await env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
  if ((await otpHash(env, phone, code)) !== row.code_hash) throw new HttpError(401, 'The code is incorrect.');

  // Single use: only the first request that marks the code as consumed can sign in.
  const used = await env.DB.prepare('UPDATE otp_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL')
    .bind(t, row.id).run();
  if (!used.meta.changes) throw new HttpError(401, 'This code was already used. Please request a new one.');

  // Link to a buyer account with this number only when the number is trusted: entered by staff (migrated or
  // staff-created) or already proven by an earlier OTP. A number a buyer typed into their own profile is not trusted.
  let user = await env.DB.prepare(
    "SELECT id FROM users WHERE phone = ? AND (google_sub LIKE 'manual:%' OR phone_verified_at IS NOT NULL) ORDER BY id LIMIT 1"
  ).bind(phone).first();
  if (user) {
    await env.DB.prepare('UPDATE users SET phone_verified_at = ?, updated_at = ? WHERE id = ?').bind(t, t, user.id).run();
  } else {
    await env.DB.prepare("INSERT INTO users (google_sub, google_email, full_name, phone, phone_verified_at, created_at, updated_at) VALUES (?, '', '', ?, ?, ?, ?)")
      .bind('phone:' + phone, phone, t, t, t)
      .run();
    user = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind('phone:' + phone).first();
  }
  return startSession(env, user.id);
}

async function logout(request, env) {
  const token = getSessionToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

async function me(request, env) {
  const userId = await getSessionUserId(request, env);
  if (!userId) return json({ authenticated: false });
  const user = await env.DB.prepare(
    `SELECT full_name, email, google_email, phone, address_line1, address_line2, city, state, country, postal_code, consent_at, lang
     FROM users WHERE id = ?`
  )
    .bind(userId)
    .first();
  return json({ authenticated: true, user, profile_complete: isProfileComplete(user) });
}

// ---------- Profile (point 2) ----------

function parseProfile(b) {
  const d = {
    full_name: clean(b.full_name, 100),
    email: clean(b.email, 254).toLowerCase(),
    phone: clean(b.phone, 20),
    address_line1: clean(b.address_line1, 200),
    address_line2: clean(b.address_line2, 200),
    city: clean(b.city, 100),
    state: clean(b.state, 100),
    country: clean(b.country, 100),
    postal_code: clean(b.postal_code, 12),
  };
  const e = {};
  if (!d.full_name) e.full_name = 'Name is required.';
  if (!EMAIL_RE.test(d.email)) e.email = 'Enter a valid email ID.';
  if (!validPhone(d.phone)) e.phone = 'Enter a 10-digit mobile number without +91.';
  if (!d.address_line1) e.address_line1 = 'Address line 1 is required.';
  if (!d.city) e.city = 'City is required.';
  if (!d.state) e.state = 'State is required.';
  if (!d.country) e.country = 'Country is required.';
  if (!/^\d{4,10}$/.test(d.postal_code)) e.postal_code = 'Enter a valid numeric postal code.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);
  return d;
}

async function saveProfile(request, env) {
  const userId = await requireUserId(request, env);
  const b = await readJson(request);
  const d = parseProfile(b);

  const current = await env.DB.prepare('SELECT consent_at FROM users WHERE id = ?').bind(userId).first();
  if (!current.consent_at && b.consent !== true) {
    throw new HttpError(422, 'Please accept the privacy notice to continue.', { consent: 'Required.' });
  }

  const t = now();
  await env.DB.prepare(
    `UPDATE users SET full_name = ?, email = ?, phone = ?, address_line1 = ?, address_line2 = ?,
       city = ?, state = ?, country = ?, postal_code = ?,
       consent_at = COALESCE(consent_at, ?), updated_at = ?,
       phone_verified_at = CASE WHEN phone = ? THEN phone_verified_at ELSE NULL END
     WHERE id = ?`
  )
    .bind(d.full_name, d.email, d.phone, d.address_line1, d.address_line2, d.city, d.state, d.country, d.postal_code, t, t, d.phone, userId)
    .run();

  return json({ ok: true });
}

// ---------- Dropdowns (point 4, managed by admin later) ----------

async function dropdowns(url, env) {
  const list = url.searchParams.get('list');
  if (!DROPDOWN_LISTS.includes(list)) throw new HttpError(400, 'Unknown list.');
  const { results } = await env.DB.prepare(
    'SELECT value, is_default FROM dropdown_options WHERE list_key = ? AND active = 1 ORDER BY sort_order, value'
  )
    .bind(list)
    .all();
  return json({ options: results });
}

// ---------- Products (points 4 and 5) ----------

function isValidPurchaseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== s) return false;
  return s <= new Date().toISOString().slice(0, 10);
}

async function listProducts(request, env) {
  const userId = await requireUserId(request, env);
  const { results } = await env.DB.prepare(
    `SELECT id, category, model_name, purchase_date, place_of_purchase, dealer_name, order_no, serial_no, created_at
     FROM products WHERE user_id = ? ORDER BY created_at DESC`
  )
    .bind(userId)
    .all();
  return json({ products: results });
}

// Bill photo: a JPEG, PNG or WebP data URL, compressed in the browser. Kept under ~900 KB of text (D1 row limit is 1 MB).
const BILL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/;
const BILL_MAX_CHARS = 900000;
function parseBill(value) {
  if (typeof value !== 'string' || value.length > BILL_MAX_CHARS) return null;
  const m = value.match(BILL_RE);
  if (!m) return null;
  const pad = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return { mime: m[1], size: Math.floor((m[2].length * 3) / 4) - pad, data: m[2] };
}

async function createProduct(request, env, ctx) {
  const userId = await requireUserId(request, env);
  const user = await requireCompleteProfile(env, userId);
  const b = await readJson(request);

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
  if (!isValidPurchaseDate(p.purchase_date)) e.purchase_date = 'Enter a valid purchase date (not in the future).';
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
  const bill = parseBill(b.bill);
  if (!bill) e.bill = 'Add a photo of the bill (JPG, PNG or WebP, under 650 KB).';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  let res;
  try {
    res = await env.DB.prepare(
      `INSERT INTO products (user_id, category, model_name, purchase_date, place_of_purchase, dealer_name, order_no,
         serial_no, serial_norm, reg_email, reg_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, p.category, p.model_name, p.purchase_date, p.place_of_purchase, p.dealer_name, p.order_no,
        p.serial_no, p.serial_no.toUpperCase(), p.reg_email, p.reg_phone, now())
      .run();
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      throw new HttpError(409, 'This serial number is already registered. Contact our service team if this is a mistake.',
        { serial_no: 'Already registered.' });
    }
    throw err;
  }

  const productId = res.meta.last_row_id;
  try {
    await env.DB.prepare('INSERT INTO product_bills (product_id, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(productId, bill.mime, bill.size, bill.data, now())
      .run();
  } catch (err) {
    // Never keep a registration without its bill copy.
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();
    throw err;
  }

  // Congratulations email runs after the response so registration never waits on Gmail.
  ctx.waitUntil(
    sendRegistrationEmail(env, productId, {
      to: p.reg_email,
      name: user.full_name,
      category: p.category,
      model: p.model_name,
    })
  );

  return json({ id: productId }, 201);
}

async function sendRegistrationEmail(env, productId, payload) {
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, template: 'registration', ...payload }),
    });
    const out = await r.json().catch(() => ({}));
    if (r.ok && out.ok) {
      await env.DB.prepare('UPDATE products SET email_sent_at = ? WHERE id = ?').bind(now(), productId).run();
    } else {
      console.error('Registration email failed for product', productId, out.error || r.status);
    }
  } catch (err) {
    console.error('Registration email error for product', productId, err);
  }
}

// ---------- Service tickets (points 6–10) ----------

async function listTickets(request, env) {
  const userId = await requireUserId(request, env);
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.ticket_no, t.status, t.issue_text, t.issue_lang, t.issue_en, t.created_at, t.updated_at, p.category, p.model_name
     FROM tickets t JOIN products p ON p.id = t.product_id
     WHERE t.user_id = ? ORDER BY t.created_at DESC`
  )
    .bind(userId)
    .all();
  const viewer = await buyerLang(env, userId);
  const tickets = await Promise.all(
    results.map(async (r) => {
      const issue = await viewText(env, 't:' + r.id, { text: r.issue_text, lang: r.issue_lang, text_en: r.issue_en }, viewer);
      const { issue_lang, issue_en, ...rest } = r;
      return { ...rest, issue_text: issue };
    })
  );
  return json({ tickets });
}

async function createTicket(request, env, ctx) {
  const userId = await requireUserId(request, env);
  const user = await requireCompleteProfile(env, userId);
  const b = await readJson(request);

  const productId = Number(b.product_id);
  const owned = Number.isInteger(productId)
    ? await env.DB.prepare('SELECT id, category, model_name FROM products WHERE id = ? AND user_id = ?').bind(productId, userId).first()
    : null;

  const t = {
    issue_text: clean(b.issue_text, 2000),
    whatsapp: clean(b.whatsapp, 20),
    contact_email: clean(b.contact_email, 254).toLowerCase(),
  };

  const e = {};
  if (!owned) e.product_id = 'Select one of your registered products.';
  if (t.issue_text.length < 10) e.issue_text = 'Describe the issue in at least 10 characters.';
  if (!validPhone(t.whatsapp)) e.whatsapp = 'Enter a 10-digit WhatsApp number without +91.';
  if (!EMAIL_RE.test(t.contact_email)) e.contact_email = 'Enter a valid email ID.';
  if (b.tc_accepted !== true) e.tc_accepted = 'Please accept the warranty terms.';
  if (Object.keys(e).length) throw new HttpError(422, 'Please fix the highlighted fields.', e);

  // The service team reads English: keep the English copy of what the buyer wrote.
  const lang = await buyerLang(env, userId);
  const issueEn = lang === 'en' ? t.issue_text : await translateText(env, t.issue_text, lang, 'en');
  const ts = now();
  const res = await env.DB.prepare(
    `INSERT INTO tickets (user_id, product_id, issue_text, issue_lang, issue_en, whatsapp, contact_email, status, tc_accepted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_engineer', ?, ?, ?)`
  )
    .bind(userId, productId, t.issue_text, lang, issueEn, t.whatsapp, t.contact_email, ts, ts, ts)
    .run();

  const id = res.meta.last_row_id;
  const ticketNo = 'BLT' + String(id).padStart(6, '0');
  await env.DB.prepare('UPDATE tickets SET ticket_no = ? WHERE id = ?').bind(ticketNo, id).run();

  ctx.waitUntil(
    sendTicketEmail(env, ticketNo, {
      to: t.contact_email,
      name: user.full_name,
      category: owned.category,
      model: owned.model_name,
      issue: t.issue_text,
      whatsapp: t.whatsapp,
    })
  );

  return json({ ticket_no: ticketNo }, 201);
}

async function sendTicketEmail(env, ticketNo, payload) {
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, template: 'ticket', ticket_no: ticketNo, ...payload }),
    });
    const out = await r.json().catch(() => ({}));
    if (!(r.ok && out.ok)) console.error('Ticket email failed', ticketNo, out.error || r.status);
  } catch (err) {
    console.error('Ticket email error', ticketNo, err);
  }
}

async function getMyTicket(request, env, id) {
  const userId = await requireUserId(request, env);
  const t = await env.DB.prepare(
    `SELECT t.id, t.ticket_no, t.status, t.issue_text, t.issue_lang, t.issue_en, t.created_at, t.updated_at, t.closed_at, p.category, p.model_name
     FROM tickets t JOIN products p ON p.id = t.product_id WHERE t.id = ? AND t.user_id = ?`
  )
    .bind(id, userId)
    .first();
  if (!t) throw new HttpError(404, 'Service request not found.');
  const { results } = await env.DB.prepare(
    'SELECT id, author_type, body, body_en, lang, created_at FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC, id ASC'
  )
    .bind(id)
    .all();
  // Each text is shown in the buyer's language (translated once, then cached).
  const viewer = await buyerLang(env, userId);
  const comments = await Promise.all(
    results.map(async (c) => ({
      body: await viewText(env, 'c:' + c.id, { text: c.body, lang: c.lang, text_en: c.body_en }, viewer),
      created_at: c.created_at,
      from: c.author_type === 'buyer' ? 'You' : 'BLEAT Service Team',
    }))
  );
  const issue = await viewText(env, 't:' + t.id, { text: t.issue_text, lang: t.issue_lang, text_en: t.issue_en }, viewer);
  delete t.issue_lang;
  delete t.issue_en;
  t.issue_text = issue;
  return json({ ticket: t, comments });
}

async function replyToTicket(request, env, id) {
  const userId = await requireUserId(request, env);
  const b = await readJson(request);
  const body = clean(b.body, 2000);
  if (body.length < 2) throw new HttpError(422, 'Please write your reply.', { body: 'Write your reply.' });

  const t = await env.DB.prepare('SELECT id, status FROM tickets WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!t) throw new HttpError(404, 'Service request not found.');
  if (t.status !== 'pending_buyer') {
    throw new HttpError(409, 'This request is not waiting for your reply.');
  }

  const ts = now();
  const lang = await buyerLang(env, userId);
  const bodyEn = lang === 'en' ? body : await translateText(env, body, lang, 'en');
  await env.DB.prepare('INSERT INTO ticket_comments (ticket_id, author_type, author_id, body, created_at, lang, body_en) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, 'buyer', userId, body, ts, lang, bodyEn)
    .run();
  await env.DB.prepare("UPDATE tickets SET status = 'pending_engineer', updated_at = ? WHERE id = ?").bind(ts, id).run();
  return json({ ok: true }, 201);
}

// ---------- Language ----------

// The language a buyer writes in and reads in. Defaults to English.
async function buyerLang(env, userId) {
  const row = await env.DB.prepare('SELECT lang FROM users WHERE id = ?').bind(userId).first();
  return row?.lang || 'en';
}

async function setLanguage(request, env) {
  const userId = await requireUserId(request, env);
  const b = await readJson(request);
  if (!LANGS.includes(b.lang)) throw new HttpError(422, 'Please choose a language.', { lang: 'Unsupported language.' });
  await env.DB.prepare('UPDATE users SET lang = ? WHERE id = ?').bind(b.lang, userId).run();
  return json({ ok: true });
}

// ---------- Router ----------

async function route(request, env, ctx, url) {
  const m = request.method;
  const p = url.pathname;

  if (m === 'POST' && p === '/api/auth/google') return loginWithGoogle(request, env);
  if (m === 'POST' && p === '/api/auth/otp/send') return sendOtp(request, env);
  if (m === 'POST' && p === '/api/auth/otp/verify') return verifyOtp(request, env);
  if (m === 'POST' && p === '/api/auth/logout') return logout(request, env);
  if (m === 'GET' && p === '/api/me') return me(request, env);
  if (m === 'PUT' && p === '/api/profile') return saveProfile(request, env);
  if (m === 'PUT' && p === '/api/me/language') return setLanguage(request, env);
  if (m === 'GET' && p === '/api/dropdowns') return dropdowns(url, env);
  if (m === 'GET' && p === '/api/products') return listProducts(request, env);
  if (m === 'POST' && p === '/api/products') return createProduct(request, env, ctx);
  if (m === 'GET' && p === '/api/tickets') return listTickets(request, env);
  if (m === 'POST' && p === '/api/tickets') return createTicket(request, env, ctx);
  const ticketMatch = p.match(/^\/api\/tickets\/(\d+)(\/reply)?$/);
  if (ticketMatch) {
    const tid = Number(ticketMatch[1]);
    if (m === 'GET' && !ticketMatch[2]) return getMyTicket(request, env, tid);
    if (m === 'POST' && ticketMatch[2]) return replyToTicket(request, env, tid);
  }

  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const res = (await handleStaff(request, env, ctx, url)) || (await route(request, env, ctx, url));
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      res.headers.set('x-content-type-options', 'nosniff');
      if (!res.headers.has('cache-control')) res.headers.set('cache-control', 'no-store');
      return res;
    } catch (err) {
      if (err instanceof HttpError || (err && err.isHttpError)) {
        return json({ error: err.message, fields: err.fields }, err.status, cors);
      }
      console.error(err);
      return json({ error: 'Something went wrong. Please try again.' }, 500, cors);
    }
  },
};
