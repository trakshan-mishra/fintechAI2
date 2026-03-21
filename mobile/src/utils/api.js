import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const getToken = async () => {
  return await SecureStore.getItemAsync('session_token');
};

const getHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Transactions
  getTransactions: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/transactions`, { headers });
  },
  
  createTransaction: async (data) => {
    const headers = await getHeaders();
    return axios.post(`${API_URL}/transactions`, data, { headers });
  },
  
  getTransactionStats: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/transactions/stats`, { headers });
  },
  
  // Markets
  getCryptoData: () => axios.get(`${API_URL}/markets/crypto`),
  getStockData: () => axios.get(`${API_URL}/markets/stocks`),
  getCommodityData: () => axios.get(`${API_URL}/markets/commodities`),
  
  // AI
  chatWithAI: async (message, sessionId) => {
    const headers = await getHeaders();
    return axios.post(`${API_URL}/ai/chat`, { message, session_id: sessionId }, { headers });
  },
  
  getAIInsights: async () => {
    const headers = await getHeaders();
    return axios.get(`${API_URL}/ai/insights`, { headers });
  }
};