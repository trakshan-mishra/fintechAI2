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
  // ── Auth ──────────────────────────────────────────────────────────────────
  getCurrentUser: async () =>
    axios.get(`${API_BASE}/auth/me`, { headers: await getHeaders() }),
  logout: async () =>
    axios.post(`${API_BASE}/auth/logout`, {}, { headers: await getHeaders() }),

  // ── Transactions ──────────────────────────────────────────────────────────
  getTransactions: async (filters = {}) =>
    axios.get(`${API_BASE}/transactions`, { headers: await getHeaders(), params: filters }),
  createTransaction: async (data) =>
    axios.post(`${API_BASE}/transactions`, data, { headers: await getHeaders() }),
  deleteTransaction: async (id) =>
    axios.delete(`${API_BASE}/transactions/${id}`, { headers: await getHeaders() }),
  getTransactionStats: async () =>
    axios.get(`${API_BASE}/transactions/stats`, { headers: await getHeaders() }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  getInvoices: async () =>
    axios.get(`${API_BASE}/invoices`, { headers: await getHeaders() }),
  createInvoice: async (data) =>
    axios.post(`${API_BASE}/invoices`, data, { headers: await getHeaders() }),

  // ── Tax ───────────────────────────────────────────────────────────────────
  getTaxSummary: async () =>
    axios.get(`${API_BASE}/tax/summary`, { headers: await getHeaders() }),

  // ── AI ────────────────────────────────────────────────────────────────────
  chatWithAI: async (message, sessionId) =>
    axios.post(`${API_BASE}/ai/chat`, { message, session_id: sessionId }, { headers: await getHeaders() }),
  getAIInsights: async () =>
    axios.get(`${API_BASE}/ai/insights`, { headers: await getHeaders() }),

  // ── Markets ───────────────────────────────────────────────────────────────
  getCryptoData: (limit = 20) =>
    axios.get(`${API_BASE}/markets/crypto`, { params: { limit } }),
  getStockData: (query) =>
    axios.get(`${API_BASE}/markets/stocks`, {params: {query}}),
  getCommodityData: (query) =>
    axios.get(`${API_BASE}/markets/commodities`, {params: {query}}),
  searchCrypto: (query) =>
    axios.get(`${API_BASE}/markets/crypto/search`, { params: { query } }),
  searchStocks: (query) =>
    axios.get(`${API_BASE}/markets/stocks/search`, { params: { query } }),
  getCryptoPrediction: async (symbol) =>
    axios.get(`${API_BASE}/markets/crypto/predict/${symbol}`, { headers: await getHeaders() }),
  aiMarketSearch: async (query, assetType = 'general') =>
    axios.post(`${API_BASE}/markets/search/ai`, { query, asset_type: assetType }, { headers: await getHeaders() }),

  // ── Portfolio ─────────────────────────────────────────────────────────────
  getPortfolio: async () =>
    axios.get(`${API_BASE}/portfolio`, { headers: await getHeaders() }),
  importPortfolio: async (data) =>
    axios.post(`${API_BASE}/portfolio/import`, data, { headers: await getHeaders() }),
  importPortfolioCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/portfolio/import/csv`, formData, {
      headers: { ...(await getHeaders()), 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteHolding: async (holdingId) =>
    axios.delete(`${API_BASE}/portfolio/${holdingId}`, { headers: await getHeaders() }),
  getPortfolioRecommendations: async () =>
    axios.post(`${API_BASE}/portfolio/ai-recommendations`, {}, { headers: await getHeaders() }),

  // ── Scanner ───────────────────────────────────────────────────────────────
  processReceipt: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/scanner/process`, formData, {
      headers: { ...(await getHeaders()), 'Content-Type': 'multipart/form-data' }
    });
  },

  // ── CSV Import ────────────────────────────────────────────────────────────
  importCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/csv`, formData, {
      headers: { ...(await getHeaders()), 'Content-Type': 'multipart/form-data' }
    });
  },
};