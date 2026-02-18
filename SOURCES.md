# Sources / Licenses

This project generates vocabulary datasets by combining:

- **English headword lists** from the NGSL Project site (New General Service List Project).
- **Korean translations + part-of-speech labels** from Kaikki.org (Wiktionary-derived data).

## NGSL Project wordlists (English headwords)

Downloaded via `scripts/crawl-ngsl-family.mjs` into `data/crawled/ngsl-family/`:

- NGSL 1.2 (`NGSL_1.2_stats.csv`)
- TSL 1.2 (`TSL_1.2_stats.csv`) (TOEIC-oriented)
- NAWL 1.2 (`NAWL_1.2_stats.csv`) (academic)
- NGSL-Spoken 1.2 (`NGSL-Spoken_1.2_stats.csv`)
- BSL 1.20 (`BSL_1.20_stats.csv`) (business)
- FEL 1.2 (`FEL_1.2_stats.csv`) (fitness/medical)
- NDL 1.1 (`NDL_1.1_stats.csv`) (New Dolch List / children's high-frequency)
- MOEL 1.0 (`Oral+English+Medical+Corpus.xlsx`) (Medical Oral English List)

Each list page on the NGSL Project site includes a Creative Commons license statement.

## Kaikki / Wiktionary (Korean translations)

Korean translations are fetched from Kaikki.org JSONL endpoints and cached under
`data/cache/kaikki/`. Kaikki data is derived from Wiktionary (CC BY-SA / GFDL).

## Notes

- The generated outputs are written to `data/wordbooks-ko/` and are validated to ensure
  every row has `en` and `ko` and that `ko` follows the expected `(명)...` style.
