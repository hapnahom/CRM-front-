/**
 * Split an email HTML body into the author's new content vs quoted history.
 * Used to hide duplicated thread history that providers append into bodyHtml.
 */

export type SplitQuotedBody = {
  latest: string;
  quoted: string | null;
};

const QUOTE_MARKERS: RegExp[] = [
  /<div[^>]*\bid\s*=\s*["']?divRplyFwdMsg["']?[^>]*>/i,
  /<div[^>]*\bid\s*=\s*["']?appendonsend["']?[^>]*>/i,
  /<div[^>]*\bclass\s*=\s*["'][^"']*\bOutlookMessageHeader\b[^"']*["'][^>]*>/i,
  /<div[^>]*\bclass\s*=\s*["'][^"']*\bgmail_quote\b[^"']*["'][^>]*>/i,
  /<div[^>]*\bclass\s*=\s*["'][^"']*\byahoo_quoted\b[^"']*["'][^>]*>/i,
  /<blockquote[^>]*\btype\s*=\s*["']?cite["']?[^>]*>/i,
  /<blockquote[^>]*>/i,
  /<hr\b[^>]*>/i,
  /<div[^>]*style\s*=\s*["'][^"']*border-top\s*:\s*solid[^"']*["'][^>]*>/i,
];

/** Outlook / Exchange header block: From: … Sent: … */
const OUTLOOK_FROM_SENT =
  /(?:<(?:b|strong)[^>]*>\s*)?From\s*(?:<\/(?:b|strong)>)?\s*:\s*(?:<\/(?:b|strong)>)?\s*[\s\S]{0,500}?(?:<(?:b|strong)[^>]*>\s*)?Sent\s*(?:<\/(?:b|strong)>)?\s*:/i;

const UNDERLINE_DIVIDER = /(?:_{10,}|─{10,}|—{10,}|＿{10,}|={10,})/;

function considerCut(cut: number, index: number): number {
  if (index <= 0) return cut;
  if (cut === -1 || index < cut) return index;
  return cut;
}

/**
 * Find the earliest quote/history boundary in HTML (or plain text converted to HTML).
 * Returns null quoted when no reliable boundary is found.
 */
export function splitQuotedEmailBody(html: string): SplitQuotedBody {
  if (!html?.trim()) return { latest: '', quoted: null };

  let cut = -1;

  for (const re of QUOTE_MARKERS) {
    const m = re.exec(html);
    if (m) cut = considerCut(cut, m.index);
  }

  const underMatch = html.match(UNDERLINE_DIVIDER);
  if (underMatch?.index != null) {
    cut = considerCut(cut, underMatch.index);
  }

  const headerMatch = OUTLOOK_FROM_SENT.exec(html);
  if (headerMatch?.index != null && headerMatch.index > 0) {
    const windowStart = Math.max(0, headerMatch.index - 160);
    const near = html.slice(windowStart, headerMatch.index);
    const nearUnder = near.search(UNDERLINE_DIVIDER);
    if (nearUnder >= 0) {
      cut = considerCut(cut, windowStart + nearUnder);
    } else {
      cut = considerCut(cut, headerMatch.index);
    }
  }

  if (cut <= 0) return { latest: html, quoted: null };

  let latest = html.slice(0, cut).trim();
  let quoted = html.slice(cut).trim();

  latest = latest.replace(/(?:<br\s*\/?>|\s|&nbsp;)+$/gi, '').trim();
  quoted = quoted
    .replace(/^(?:<br\s*\/?>|\s|&nbsp;|_)+/gi, '')
    .replace(/^(?:_{10,}|─{10,}|—{10,}|＿{10,}|={10,})\s*/m, '')
    .replace(/^(?:<br\s*\/?>|\s|&nbsp;)+/gi, '')
    .trim();

  const latestText = latest.replace(/<[^>]+>/g, '').trim();
  const quotedText = quoted.replace(/<[^>]+>/g, '').trim();
  if (!latestText || !quotedText) {
    return { latest: html, quoted: null };
  }

  return { latest, quoted };
}
