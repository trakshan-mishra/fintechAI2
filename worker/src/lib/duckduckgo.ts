const NEEDS_SEARCH_PATTERNS = [
  /\b(price|rate|value|cost)\b.*\b(of|for)\b/,
  /\b(current|today|now|latest|live|real.?time)\b/,
  /\b(how much|what is|tell me)\b.*\b(worth|cost|price)\b/,
  /\b(stock|share|crypto|bitcoin|eth|gold|silver|crude|commodity)\b/,
  /\b(market|nifty|sensex|nasdaq|dow|s&p)\b/,
  /\b(news|update|happening|trending|forecast|predict)\b/,
  /\b(buy|sell|hold|invest|trade)\b/,
  /\b(sentiment|analysis|outlook|target)\b/,
  /\b(polymarket|prediction.?market|betting.?odds)\b/,
  /\b(weather|temperature|election|gdp|inflation|rbi|fed)\b/,
];

export function shouldSearch(question: string): boolean {
  const q = question.toLowerCase();
  return NEEDS_SEARCH_PATTERNS.some((p) => p.test(q));
}

export async function webSearch(query: string, maxResults = 5): Promise<string> {
  try {
    const r = await fetch(
      `https://api.duckduckgo.com/?${new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1' })}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (r.ok) {
      const data = await r.json() as { Abstract?: string; RelatedTopics?: Array<{ Text?: string }> };
      const snippets: string[] = [];
      if (data.Abstract) snippets.push(data.Abstract);
      for (const topic of (data.RelatedTopics ?? []).slice(0, maxResults)) {
        if (topic?.Text) snippets.push(topic.Text);
      }
      if (snippets.length) return snippets.slice(0, maxResults).join('\n');
    }
  } catch (e) {
    console.warn('DuckDuckGo search failed', e);
  }
  return '';
}
