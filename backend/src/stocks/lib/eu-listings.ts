import type { ListedStock } from './types';

const EU_EXCHANGE_SUFFIXES = new Set([
  '.PA', '.DE', '.L', '.AS', '.MI', '.MC', '.ST', '.HE', '.CO', '.OL',
  '.BR', '.LS', '.IR', '.VI', '.WA',
]);

export function isEuTicker(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  for (const suffix of EU_EXCHANGE_SUFFIXES) {
    if (upper.endsWith(suffix)) return true;
  }
  return false;
}

type WikiIndex = {
  page: string;
  sectionIndex: number;
  exchangeSuffix: string;
};

const WIKI_INDICES: WikiIndex[] = [
  { page: 'CAC_40', sectionIndex: 10, exchangeSuffix: '.PA' },
  { page: 'DAX', sectionIndex: 6, exchangeSuffix: '.DE' },
  { page: 'FTSE_100_Index', sectionIndex: 7, exchangeSuffix: '.L' },
  { page: 'AEX_index', sectionIndex: 8, exchangeSuffix: '.AS' },
];

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

function stripWikiMarkup(raw: string): string {
  let s = raw;
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s
      .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, '$2')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/<[^>]*>/g, '');
  }
  return s.trim();
}

function parseWikiTable(
  wikitext: string,
  fallbackSuffix: string,
): { ticker: string; name: string }[] {
  const results: { ticker: string; name: string }[] = [];

  const tableMatch = wikitext.match(/\{\|[^\n]*wikitable[^\n]*\n([\s\S]*?)\n\|\}/);
  if (!tableMatch) return results;

  const tableBody = tableMatch[1];
  const segments = tableBody.split(/\n\|-/);

  let headerIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].match(/(?:^|\n)\s*!/)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return results;

  const headerSeg = segments[headerIdx].trim();
  const headerLine = headerSeg.startsWith('!')
    ? headerSeg
    : headerSeg.replace(/^[\s\S]*?\n\s*!/, '!');
  const rawHeader = headerLine.replace(/^!\|?/, '');

  const headers = rawHeader
    .split(/!!|\|\||\n!/)
    .map((h) => stripWikiMarkup(h.replace(/^\|/, '')).toLowerCase());

  const tickerCol = headers.findIndex((h) => h.includes('ticker') || h.includes('symbol'));
  const companyCol = headers.findIndex((h) => h.includes('company') || h.includes('name'));

  if (tickerCol === -1 && companyCol === -1) return results;

  const dataSegments = segments.slice(headerIdx + 1);

  for (const row of dataSegments) {
    const rowText = row.replace(/^\s*\n?\|?\s*/, '').trim();
    if (!rowText || rowText.startsWith('!')) continue;

    const contentLine = rowText.startsWith('|') ? rowText.slice(1) : rowText;
    const cells = contentLine.split('||').map((c) => c.trim());

    if (cells.length < Math.max(tickerCol, companyCol) + 1) continue;

    const tickerCell = tickerCol >= 0 ? cells[tickerCol] ?? '' : '';
    const companyCell = companyCol >= 0 ? cells[companyCol] ?? '' : '';

    const fwbMatch = tickerCell.match(/\{\{FWB link\|([^}]+)\}\}/);
    let ticker = fwbMatch ? fwbMatch[1].trim() : stripWikiMarkup(tickerCell).split(/\s/)[0];
    const company = stripWikiMarkup(companyCell);

    if (!company && !ticker) continue;
    if (!ticker && company) continue;

    const hasSuffix = EU_EXCHANGE_SUFFIXES.has(
      ticker.substring(ticker.lastIndexOf('.')).toUpperCase(),
    );
    if (ticker && !hasSuffix) {
      ticker = ticker.replace(/\./g, '-') + fallbackSuffix;
    }

    ticker = ticker.toUpperCase().trim();
    if (!ticker || !company) continue;

    results.push({ ticker, name: company });
  }

  return results;
}

async function fetchWikiSection(page: string, section: number): Promise<string> {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&section=${section}&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 's2-stock-app/1.0 (stock listing aggregator)' },
  });
  if (!res.ok) return '';
  const json = await res.json();
  return json?.parse?.wikitext?.['*'] ?? '';
}

const EU_LISTING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let euListingCache: { data: ListedStock[]; fetchedAt: number } | null = null;

export async function fetchEuListings(): Promise<ListedStock[]> {
  if (euListingCache && Date.now() - euListingCache.fetchedAt < EU_LISTING_CACHE_TTL_MS) {
    return euListingCache.data;
  }

  const sections = await Promise.all(
    WIKI_INDICES.map((idx) => fetchWikiSection(idx.page, idx.sectionIndex)),
  );

  const seen = new Set<string>();
  const stocks: ListedStock[] = [];

  for (let i = 0; i < WIKI_INDICES.length; i++) {
    const idx = WIKI_INDICES[i];
    const wikitext = sections[i];
    if (!wikitext) continue;

    const parsed = parseWikiTable(wikitext, idx.exchangeSuffix);
    for (const { ticker, name } of parsed) {
      if (seen.has(ticker)) continue;
      seen.add(ticker);
      stocks.push({ ticker, name, exchange: 'EU' });
    }
  }

  euListingCache = { data: stocks, fetchedAt: Date.now() };
  return stocks;
}
