import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { requireAuth } from '../auth';

const transactionRoutes = new Hono<AppEnv>();
transactionRoutes.use('*', requireAuth);

transactionRoutes.get('/', async (c) => {
  const user = c.get('user');
  const type = c.req.query('type');
  const category = c.req.query('category');
  let sql = 'SELECT transaction_id, user_id, type, amount, category, description, date, receipt_url, created_at FROM transactions WHERE user_id = ?';
  const params: string[] = [user.id];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY created_at DESC LIMIT 1000';
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results);
});

transactionRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const transactionId = `txn_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const createdAt = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO transactions (transaction_id, user_id, type, amount, category, description, date, receipt_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(transactionId, user.id, body.type, body.amount, body.category, body.description ?? null, body.date, body.receipt_url ?? null, createdAt).run();
  return c.json({ transaction_id: transactionId, user_id: user.id, ...body, created_at: createdAt });
});

transactionRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?').bind(id, user.id).run();
  if (!result.meta.changes) return c.json({ detail: 'Transaction not found' }, 404);
  return c.json({ message: 'Transaction deleted' });
});

transactionRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
       COUNT(*) AS transaction_count
     FROM transactions WHERE user_id = ?`,
  ).bind(user.id).first();
  const totalIncome = (row?.total_income as number) ?? 0;
  const totalExpense = (row?.total_expense as number) ?? 0;
  return c.json({
    total_income: totalIncome,
    total_expense: totalExpense,
    balance: totalIncome - totalExpense,
    transaction_count: (row?.transaction_count as number) ?? 0,
  });
});

export default transactionRoutes;
