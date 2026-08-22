const MODEL = 'gemini-2.5-flash';

export async function generate(apiKey: string, body: Record<string, unknown>, timeoutMs: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Gemini API error: ${resp.status} - ${text.slice(0, 300)}`);
      return `AI temporarily unavailable (HTTP ${resp.status}). Please try again.`;
    }
    const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join('').trim();
    return text || 'No response generated.';
  } catch (e) {
    console.error('Gemini call failed', e);
    return 'AI service temporarily unavailable. Please try again.';
  }
}

export async function callGemini(apiKey: string, messages: Array<{ role: string; content: string }>, useSearch = true): Promise<string> {
  if (!apiKey) return 'AI service not configured. Please set GEMINI_API_KEY.';
  const contents = messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
  const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 4096, temperature: 0.7 } };
  if (useSearch) body.tools = [{ google_search: {} }];
  return generate(apiKey, body, 45000);
}

export async function callLlm(
  apiKey: string, system: string, prompt: string,
  opts: { maxTokens?: number; timeoutMs?: number; useSearch?: boolean } = {},
): Promise<string> {
  if (!apiKey) return 'AI service not configured.';
  const { maxTokens = 4096, timeoutMs = 45000, useSearch = false } = opts;
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: `${system} ${prompt}` }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];
  return generate(apiKey, body, timeoutMs);
}
