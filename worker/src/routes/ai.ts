import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../env';
import { verifyFirebaseToken } from '../auth';
import { shouldSearch, webSearch } from '../lib/duckduckgo';
import { callGemini, callLlm } from '../lib/gemini';
import { getPolymarketSentiment } from '../lib/polymarket';

async function optionalUserId(c: Context<AppEnv>): Promise<string> {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) return 'anonymous';
  try {
    const user = await verifyFirebaseToken(authorization.slice(7), c.env.FIREBASE_PROJECT_ID);
    return user.id;
  } catch {
    return 'anonymous';
  }
}

const aiRoutes = new Hono<AppEnv>();

aiRoutes.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.session_id || `sess_${crypto.randomUUID().slice(0, 8)}`;
    const query: string = body.message.trim();
    const historyRow = await c.env.DB.prepare('SELECT messages FROM ai_chats WHERE session_id = ?').bind(sessionId).first();
    let messages: Array<{ role: string; content: string }> = historyRow ? JSON.parse(historyRow.messages as string).slice(-5) : [];
    let searchContext = '';
    if (shouldSearch(query)) {
      const results = await webSearch(query);
      if (results) searchContext = `\nREAL-TIME WEB DATA:\n${results}\n\nUse this data as primary source.\n`;
    }
    const systemPrompt = `You are a powerful AI assistant with real-time Google Search access.

RULES:
- For market/financial queries, use Google Search grounding to get live data
- Provide specific numbers, prices, and data points
- If you have live data from search, cite it
- Be direct and actionable
- Format responses with markdown for readability`;
    messages = [{ role: 'user', content: systemPrompt }, ...messages, { role: 'user', content: `${searchContext} User: ${query}` }];
    const response = await callGemini(c.env.GEMINI_API_KEY, messages, true);
    messages.push({ role: 'assistant', content: response });
    const trimmed = messages.slice(-20);
    const userId = await optionalUserId(c);
    await c.env.DB.prepare(
      `INSERT INTO ai_chats (session_id, user_id, messages, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at`,
    ).bind(sessionId, userId, JSON.stringify(trimmed), new Date().toISOString()).run();
    return c.json({ response, session_id: sessionId });
  } catch (e) {
    console.error('AI Chat error', e);
    return c.json({ response: 'Something went wrong. Please try again.', session_id: null });
  }
});

const aiMarketSearchRoute = new Hono<AppEnv>();

aiMarketSearchRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const polyData = await getPolymarketSentiment(body.query);
    let polyContext = '';
    const markets = polyData.markets ?? [];
    if (markets.length) {
      polyContext = '\nPrediction Market Data (Polymarket):\n';
      for (const m of markets.slice(0, 3)) polyContext += `- ${m.question}\n`;
    }
    const prompt = `Research: ${body.query}
Asset type: ${body.asset_type ?? 'general'}
${polyContext}
Provide:
1. **Current Status** (live price/data)
2. **Technical Outlook** (support/resistance)
3. **Fundamental Analysis**
4. **Market Sentiment** (from news + prediction markets)
5. **Bull Case**
6. **Bear Case**
7. **Recommendation** (Buy/Sell/Hold with price targets)
8. **Risk Factors**`;
    const result = await callLlm(
      c.env.GEMINI_API_KEY,
      'You are a professional financial research analyst. Use Google Search to pull live prices and recent news.',
      prompt,
      { maxTokens: 4096, timeoutMs: 45000, useSearch: true },
    );
    return c.json({ success: true, result, query: body.query, polymarket: polyData });
  } catch (e) {
    return c.json({ detail: String(e) }, 500);
  }
});

export { aiRoutes, aiMarketSearchRoute };
