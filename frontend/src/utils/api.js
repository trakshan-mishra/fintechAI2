import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

let _getToken = null;
export const setTokenGetter = (fn) => { _getToken = fn; };

const getHeaders = async () => {
  if (_getToken) {
    const token = await _getToken();
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const api = {
  // Auth
  getCurrentUser: async () => axios.get(`${API_BASE}/auth/me`, { headers: await getHeaders() }),
  logout: async () => axios.post(`${API_BASE}/auth/logout`, {}, { headers: await getHeaders() }),
  // Legacy session exchange (AuthCallback) — kept for backwards compat
  createSession: async (sessionId) => axios.post(`${API_BASE}/auth/session`, { session_id: sessionId }),
  // Transactions
  getTransactions: async (filters = {}) => axios.get(`${API_BASE}/transactions`, { headers: await getHeaders(), params: filters }),
  createTransaction: async (data) => axios.post(`${API_BASE}/transactions`, data, { headers: await getHeaders() }),
  deleteTransaction: async (id) => axios.delete(`${API_BASE}/transactions/${id}`, { headers: await getHeaders() }),
  getTransactionStats: async () => axios.get(`${API_BASE}/transactions/stats`, { headers: await getHeaders() }),
  // Invoices
  getInvoices: async () => axios.get(`${API_BASE}/invoices`, { headers: await getHeaders() }),
  createInvoice: async (data) => axios.post(`${API_BASE}/invoices`, data, { headers: await getHeaders() }),
  // Tax
  getTaxSummary: async () => axios.get(`${API_BASE}/tax/summary`, { headers: await getHeaders() }),
  // AI
  chatWithAI: async (message, sessionId) => axios.post(`${API_BASE}/ai/chat`, { message, session_id: sessionId }, { headers: await getHeaders() }),
  getAIInsights: async () => axios.get(`${API_BASE}/ai/insights`, { headers: await getHeaders() }),
  // Markets
  getCryptoData: (limit = 20) => axios.get(`${API_BASE}/markets/crypto`, { params: { limit } }),
  getStockData: () => axios.get(`${API_BASE}/markets/stocks`),
  getCommodityData: () => axios.get(`${API_BASE}/markets/commodities`),
  searchCrypto: (query) => axios.get(`${API_BASE}/markets/crypto/search`, { params: { query } }),
  searchStocks: (query) => axios.get(`${API_BASE}/markets/stocks/search`, { params: { query } }),
  getCryptoPrediction: async (symbol) => axios.get(`${API_BASE}/markets/crypto/predict/${symbol}`, { headers: await getHeaders() }),
  getStockPrediction: async (symbol) => axios.get(`${API_BASE}/markets/stocks/predict/${symbol}`, { headers: await getHeaders() }),
  getCommodityPrediction: async (symbol) => axios.get(`${API_BASE}/markets/commodities/predict/${symbol}`, { headers: await getHeaders() }),
  // Import
  importPaytm: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/paytm`, formData, { headers: { ...(await getHeaders()), 'Content-Type': 'multipart/form-data' } });
  },
  processReceipt: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/scanner/process`, formData, { headers: { ...(await getHeaders()), 'Content-Type': 'multipart/form-data' } });
  },
  // Telegram
  connectTelegram: async (chatId) => axios.post(`${API_BASE}/telegram/connect`, { chat_id: chatId }, { headers: await getHeaders() }),
  sendTelegramNotification: async (message) => axios.post(`${API_BASE}/telegram/notify`, null, { headers: await getHeaders(), params: { message } }),
  sendTransactionAlert: async (transactionId) => axios.post(`${API_BASE}/telegram/alerts/transaction`, null, { headers: await getHeaders(), params: { transaction_id: transactionId } }),
};