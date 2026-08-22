import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './env';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import marketRoutes from './routes/markets';
import { aiRoutes, aiMarketSearchRoute } from './routes/ai';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const allowed = c.env.CORS_ORIGINS.split(',').map((s) => s.trim());
  return cors({
    origin: (origin: string) => (allowed.includes(origin) ? origin : allowed[0]),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })(c, next);
});

app.get('/api/', (c) => c.json({ message: 'TradeTrack Pro API (Cloudflare Workers)', version: '2.0.0' }));
app.get('/api/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.route('/api/auth', authRoutes);
app.route('/api/transactions', transactionRoutes);
app.route('/api/markets', marketRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/markets/search/ai', aiMarketSearchRoute);

export default app;
