import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

// ─── Token helpers ─────────────────────────────────────────────────────────────
const getToken = async () => SecureStore.getItemAsync('session_token');

const getHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── API client ────────────────────────────────────────────────────────────────
export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────────
  getMe: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/auth/me`, { headers });
  },

  // ── Transactions ──────────────────────────────────────────────────────────────
  getTransactions: async (filters = {}) => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/transactions`, { headers, params: filters });
  },

  createTransaction: async (data) => {
    const headers = await getHeaders();
    return axios.post(`${API_URL}/transactions`, data, { headers });
  },

  deleteTransaction: async (id) => {
    const headers = await getHeaders();
    return axios.delete(`${API_URL}/transactions/${id}`, { headers });
  },

  getTransactionStats: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/transactions/stats`, { headers });
  },

  // ── Invoices ──────────────────────────────────────────────────────────────────
  getInvoices: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/invoices`, { headers });
  },

  createInvoice: async (data) => {
    const headers = await getHeaders();
    return axios.post(`${API_URL}/invoices`, data, { headers });
  },

  // ── Tax ───────────────────────────────────────────────────────────────────────
  getTaxSummary: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/tax/summary`, { headers });
  },

  // ── Markets (no auth needed) ──────────────────────────────────────────────────
  getCryptoData: (limit = 20) =>
    axios.get(`${API_URL}/markets/crypto`, { params: { limit } }),

  getStockData: () =>
    axios.get(`${API_URL}/markets/stocks`),

  getCommodityData: () =>
    axios.get(`${API_URL}/markets/commodities`),

  // ── AI ────────────────────────────────────────────────────────────────────────
  chatWithAI: async (message, sessionId) => {
    const headers = await getHeaders();
    return axios.post(
      `${API_URL}/ai/chat`,
      { message, session_id: sessionId },
      { headers }
    );
  },

  getAIInsights: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/ai/insights`, { headers });
  },

  askAIQuestion: async (category, question) => {
    const headers = await getHeaders();
    return axios.post(
      `${API_URL}/ai/qna/ask`,
      null,
      { headers, params: { category, question } }
    );
  },

  getAIQnACategories: async () => {
    return axios.get(`${API_URL}/ai/qna/categories`);
  },

  // ── Scanner ───────────────────────────────────────────────────────────────────
  processReceipt: async (file) => {
    const headers = await getHeaders();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    });
    return axios.post(`${API_URL}/scanner/process`, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    });
  },
};