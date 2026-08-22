// AI library — multi-key Gemini + Workers AI fallback chain.
// Rotates through multiple Gemini keys, then Workers AI (free), then graceful fallback.
// Never exposes errors to users.

// Gemini keys (set via wrangler secret put GEMINI_API_KEYS, comma-separated)
// One dedicated key for scanner (set via GEMINI_SCANNER_KEY)
function getGeminiKeys(envKey?: string): string[] {
  if (!envKey) return [];
  return envKey.split(',').map(k => k.trim()).filter(Boolean);
}

// Workers AI free models (try in order) — updated Aug 2026
const WORKERS_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-70b-instruct',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@cf/meta/mistral-7b-instruct-v0.2',
];

interface ChatMessage { role: string; content: string }

// Try Gemini with multiple keys — rotate on failure
async function tryGemini(keys: string[], messages: ChatMessage[], useSearch: boolean): Promise<string | null> {
  for (const key of keys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const contents = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 4096, temperature: 0.7 } };
      if (useSearch) body.tools = [{ google_search: {} }];
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
      if (!resp.ok) {
        console.warn(`Gemini key ...${key.slice(-6)} failed: ${resp.status}`);
        continue; // try next key
      }
      const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map(p => p.text ?? '').join('').trim();
      if (text) return text;
    } catch (e) {
      console.warn(`Gemini key ...${key.slice(-6)} error:`, e instanceof Error ? e.message : String(e));
    }
  }
  return null;
}

// Try Workers AI models one by one
async function tryWorkersAI(ai: Ai, messages: ChatMessage[]): Promise<string | null> {
  for (const model of WORKERS_MODELS) {
    try {
      const response = await ai.run(model, {
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : 'system',
          content: m.content,
        })),
        max_tokens: 4096,
      }) as { response?: string };
      if (response?.response?.trim()) return response.response.trim();
    } catch (e) {
      console.warn(`Workers AI ${model} failed:`, e instanceof Error ? e.message : String(e));
    }
  }
  return null;
}

// Graceful fallback — never show errors to users
function generateDataFallback(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('ipo')) {
    return 'IPO data is being updated. Please check back shortly, or visit the SEBI/NSE website for the latest IPO listings.';
  }
  if (q.includes('allocat') || q.includes('best fit') || q.includes('invest')) {
    return '**Conservative:** PPF (7.1%), FD (6.5%), Liquid Funds (6-7%)\n\n**Balanced:** Nifty 50 Index (12%), Flexi Cap Funds (14%)\n\n**Aggressive:** Small Cap Funds (18-20%), Sectoral Funds (15-25%)\n\n*AI analysis temporarily unavailable. These are standard historical averages. Verify on AMFI/SEBI.*';
  }
  if (q.includes('predict') || q.includes('analysis') || q.includes('outlook')) {
    return 'AI analysis is being updated. Live market data and technical indicators are available in the Trading Dashboard and Markets tabs.';
  }
  return 'AI analysis is being updated. Market data and prices are still live — check the Markets and Trading Dashboard tabs for real-time data.';
}

/**
 * Main AI call — tries Gemini keys → Workers AI → graceful fallback.
 * @param ai - Workers AI binding (c.env.AI)
 * @param messages - Chat messages
 * @param useSearch - Enable Google Search grounding
 * @param geminiKeys - Comma-separated Gemini keys (c.env.GEMINI_API_KEYS or c.env.GEMINI_API_KEY)
 */
export async function callGemini(
  ai: Ai,
  messages: ChatMessage[],
  useSearch = true,
  geminiKeys?: string,
): Promise<string> {
  // 1. Try Gemini with key rotation
  const keys = getGeminiKeys(geminiKeys);
  if (keys.length) {
    const result = await tryGemini(keys, messages, useSearch);
    if (result) return result;
  }

  // 2. Try Workers AI (free)
  const workersResult = await tryWorkersAI(ai, messages);
  if (workersResult) return workersResult;

  // 3. Graceful fallback
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  return generateDataFallback(lastUserMsg);
}

/**
 * Call AI with system + user prompt.
 * Uses a dedicated scanner key if provided (separate quota).
 */
export async function callLlm(
  ai: Ai,
  system: string,
  prompt: string,
  opts: { maxTokens?: number; useSearch?: boolean; geminiKeys?: string; scannerKey?: string } = {},
): Promise<string> {
  const keys = opts.scannerKey ? [opts.scannerKey, ...(getGeminiKeys(opts.geminiKeys) || [])] : getGeminiKeys(opts.geminiKeys);
  return callGemini(ai, [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ], opts.useSearch ?? true, keys.join(',') || undefined);
}
