/**
 * BLEAT — Google Apps Script mailer
 * Sends transactional emails from Contact@bleatconnect.com on behalf of the Worker.
 *
 * Setup:
 *  1. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *  2. Project Settings > Script properties: add SHARED_SECRET = same value as the Worker's APPS_SCRIPT_SECRET.
 *  3. In the Gmail account that owns Contact@bleatconnect.com: Settings > Accounts > "Send mail as"
 *     and add/verify Contact@bleatconnect.com, so the From address is accepted.
 */

const REG_SUBJECT = 'Congratulations for Registration of Product';
const BANNER_URL = 'https://service.bleatconnect.in/email-banner.png'; // header image, host it on your site
const FROM_ADDRESS = 'contact@bleatconnect.com';

function doGet() {
  return jsonOut({ ok: true, service: "BLEAT mailer", note: "Use POST from the Worker." });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!expected || data.secret !== expected) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }

    if (data.template === 'registration') {
      sendRegistrationEmail(data);
      return jsonOut({ ok: true });
    }

    if (data.template === 'ticket') {
      sendTicketEmail(data);
      return jsonOut({ ok: true });
    }

    if (data.template === 'comment') {
      sendCommentEmail(data);
      return jsonOut({ ok: true });
    }

    return jsonOut({ ok: false, error: 'unknown template' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function sendRegistrationEmail(d) {
  const name = esc(d.name);
  const category = esc(d.category);
  const model = esc(d.model);

  // Plain-text version (always present; shown if HTML or images are blocked)
  const text =
    `Congratulations ${d.name} for Registration of ${d.category} - ${d.model}.\n\n` +
    `Please keep your Bill Safe to claim warranty.\n\n` +
    `Team BLEAT\nwww.bleatconnect.com`;

  // HTML version: header image + the same message
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1d2330">
    <img src="${BANNER_URL}" alt="BLEAT" width="600" style="display:block;width:100%;height:auto;border:0">
    <div style="padding:24px;background:#ffffff">
      <h2 style="margin:0 0 16px;font-size:22px">Congratulations ${name}!</h2>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px">
        Congratulations <strong>${name}</strong> for Registration of
        <strong>${category}</strong> - <strong>${model}</strong>.
      </p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px">
        <strong>Please keep your Bill Safe to claim warranty.</strong>
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0">Team BLEAT · www.bleatconnect.com</p>
    </div>
  </div>`;

  // Send as contact@ only when that alias exists in this Gmail account; otherwise send from the account itself.
  var opts = { htmlBody: html, name: 'BLEAT', replyTo: FROM_ADDRESS };
  try {
    if (GmailApp.getAliases().indexOf(FROM_ADDRESS) >= 0) opts.from = FROM_ADDRESS;
  } catch (aliasErr) { /* keep sending from the account itself */ }
  GmailApp.sendEmail(d.to, REG_SUBJECT, text, opts);
}

function sendTicketEmail(d) {
  const subject = 'Service request received - ' + d.ticket_no;
  const text =
    `Dear ${d.name},\n\n` +
    `We have received your service request ${d.ticket_no} for ${d.category} - ${d.model}.\n\n` +
    `Issue: ${d.issue}\n\n` +
    `Our service team will contact you on WhatsApp at ${d.whatsapp}. ` +
    `Please keep ticket number ${d.ticket_no} to track the status.\n\n` +
    `Team BLEAT\nwww.bleatconnect.com`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1d2330;padding:24px">
    <h2 style="margin:0 0 16px;font-size:22px">Service request received</h2>
    <p style="font-size:16px;line-height:1.5;margin:0 0 12px">Dear ${esc(d.name)},</p>
    <p style="font-size:16px;line-height:1.5;margin:0 0 12px">
      We have received your service request <strong>${esc(d.ticket_no)}</strong>
      for <strong>${esc(d.category)} - ${esc(d.model)}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.5;background:#f6f7f9;padding:12px;border-radius:6px;margin:0 0 12px">
      <strong>Issue:</strong> ${esc(d.issue)}
    </p>
    <p style="font-size:16px;line-height:1.5;margin:0 0 16px">
      Our service team will contact you on WhatsApp at <strong>${esc(d.whatsapp)}</strong>.
      Please keep ticket number <strong>${esc(d.ticket_no)}</strong> to track the status.
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0">Team BLEAT · www.bleatconnect.com</p>
  </div>`;

  sendFromBrand_(d.to, subject, text, html);
}

// Send as contact@ only when that alias exists in this Gmail account; otherwise send from the account itself.
function sendFromBrand_(to, subject, text, html) {
  const opts = { htmlBody: html, name: 'BLEAT', replyTo: FROM_ADDRESS };
  try {
    if (GmailApp.getAliases().indexOf(FROM_ADDRESS) >= 0) opts.from = FROM_ADDRESS;
  } catch (aliasErr) { /* keep sending from the account itself */ }
  GmailApp.sendEmail(to, subject, text, opts);
}

function sendCommentEmail(d) {
  const subject = 'Update on your service request ' + d.ticket_no;
  const action = d.needs_reply
    ? 'Our team needs more information. Please reply in the BLEAT service portal under your request.'
    : 'You can follow this request in the BLEAT service portal.';
  const text =
    `Dear customer,\n\n` +
    `There is an update on your service request ${d.ticket_no}.\n\n` +
    `${d.body}\n\n` +
    `Status: ${d.status_label}\n` +
    `${action}\n\n` +
    `Team BLEAT\nwww.bleatconnect.com`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1d2330;padding:24px">
    <h2 style="margin:0 0 16px;font-size:22px">Update on your service request</h2>
    <p style="font-size:16px;line-height:1.5;margin:0 0 12px">Ticket <strong>${esc(d.ticket_no)}</strong></p>
    <p style="font-size:15px;line-height:1.5;background:#f6f7f9;padding:12px;border-radius:6px;margin:0 0 12px;white-space:pre-wrap">${esc(d.body)}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 12px"><strong>Status:</strong> ${esc(d.status_label)}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${esc(action)}</p>
    <p style="font-size:13px;color:#6b7280;margin:0">Team BLEAT · www.bleatconnect.com</p>
  </div>`;

  sendFromBrand_(d.to, subject, text, html);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
