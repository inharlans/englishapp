const COLLAPSE_SPACE_RE = /\s+/g;
const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019\u02BC]/g;
const POSSESSIVE_TAIL_RE = /'s\b/;
const APOSTROPHE_RE = /'/g;
const PUNCT_CHAR_RE = /\p{P}/u;

function stripPunctuationPreserveAmpersand(text: string): string {
  let output = "";
  for (const char of text) {
    if (char !== "&" && char !== "#" && PUNCT_CHAR_RE.test(char)) {
      output += " ";
      continue;
    }
    output += char;
  }
  return output;
}

export function normalizeTerm(term: string): string {
  if (!term) return "";

  const normalizedUnicode = term.normalize("NFKC");
  const lowercased = normalizedUnicode.toLowerCase();
  const unifiedApostrophe = lowercased.replace(APOSTROPHE_VARIANTS_RE, "'");
  const possessiveHandled = unifiedApostrophe.replace(POSSESSIVE_TAIL_RE, "s");
  const collapsedApostrophe = possessiveHandled.replace(APOSTROPHE_RE, "");
  const withoutPunctuation = stripPunctuationPreserveAmpersand(collapsedApostrophe);

  return withoutPunctuation.replace(COLLAPSE_SPACE_RE, " ").trim();
}
