// Translation for the service portal, using Cloudflare Workers AI.
//  - Buyer text (any supported language) -> English, so the service team always reads English.
//  - Service team text (English) -> the buyer's own language, for display.
// Each translation is cached in the `translations` table, so a text is translated once per language.

export const LANGS = ['en', 'hi', 'ta', 'te', 'ml', 'bn', 'kn', 'mr', 'gu', 'pa', 'or', 'as'];

// IndicTrans2 (English -> Indian language) uses these FLORES codes.
const FLORES = {
  hi: 'hin_Deva', ta: 'tam_Taml', te: 'tel_Telu', ml: 'mal_Mlym', bn: 'ben_Beng', kn: 'kan_Knda',
  mr: 'mar_Deva', gu: 'guj_Gujr', pa: 'pan_Guru', or: 'ory_Orya', as: 'asm_Beng',
};

// The models work best on short passages, so long text is split at line or word breaks.
function chunks(text, max = 800) {
  const out = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max / 2) cut = rest.lastIndexOf(' ', max);
    if (cut < 1) cut = max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
}

function pickText(r) {
  return r?.translated_text ?? r?.translations?.[0] ?? r?.result?.translated_text ?? null;
}

// Translate plain text between two supported languages.
// Returns null on failure, so callers can fall back to the original text.
export async function translateText(env, text, from, to) {
  if (!text || from === to) return text;
  try {
    const parts = [];
    for (const piece of chunks(text)) {
      let r;
      if (to === 'en') {
        // Indian language -> English (m2m100 takes ISO codes such as 'hi').
        r = await env.AI.run('@cf/meta/m2m100-1.2b', { text: piece, source_lang: from, target_lang: 'en' });
      } else if (from === 'en' && FLORES[to]) {
        // English -> Indian language (IndicTrans2).
        r = await env.AI.run('@cf/ai4bharat/indictrans2-en-indic-1B', { text: piece, target_language: FLORES[to] });
      } else {
        throw new Error(`unsupported pair ${from} -> ${to}`);
      }
      const out = pickText(r);
      if (!out) throw new Error('empty translation result');
      parts.push(out);
    }
    return parts.join('\n');
  } catch (err) {
    console.error('translation failed', from, to, err);
    return null;
  }
}

// The text a viewer should see.
//  row = { text: as written, lang: language it was written in, text_en: English copy (may be null) }
//  - written in the viewer's language  -> show as written
//  - viewer is English                 -> show the English copy
//  - otherwise                         -> translate the English copy once and cache it
export async function viewText(env, ref, row, viewerLang) {
  if (row.lang === viewerLang) return row.text;
  const english = row.text_en ?? row.text;
  if (viewerLang === 'en') return english;
  const cached = await env.DB.prepare('SELECT text FROM translations WHERE ref = ? AND lang = ?')
    .bind(ref, viewerLang)
    .first();
  if (cached) return cached.text;
  const out = await translateText(env, english, 'en', viewerLang);
  if (!out) return english;
  await env.DB.prepare('INSERT OR REPLACE INTO translations (ref, lang, text) VALUES (?, ?, ?)')
    .bind(ref, viewerLang, out)
    .run();
  return out;
}
