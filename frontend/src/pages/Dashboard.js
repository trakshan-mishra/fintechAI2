import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, Receipt } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cryptoData, setCryptoData] = useState([]);
useEffect(() => {
  if (loading) return;

  const timeout = setTimeout(() => {
    if (!user) {
      navigate('/sign-in');
    }
  }, 500);

  return () => clearTimeout(timeout);
}, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, transactionsRes, cryptoRes] = await Promise.all([
        api.getTransactionStats(),
        api.getTransactions(),
        api.getCryptoData()
      ]);
      
      setStats(statsRes.data);
      setTransactions(transactionsRes.data.slice(0, 5));
      setCryptoData(cryptoRes.data.slice(0, 5));
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" data-testid="dashboard-loading"></div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Balance',
      value: stats?.balance || 0,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Total Income',
      value: stats?.total_income || 0,
      icon: ArrowUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Total Expenses',
      value: stats?.total_expense || 0,
      icon: ArrowDown,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    },
    {
      title: 'Transactions',
      value: stats?.transaction_count || 0,
      icon: Receipt,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      isCurrency: false
    }
  ];

  const categoryData = stats?.category_breakdown ? Object.entries(stats.category_breakdown).map(([name, values]) => ({
    name,
    value: values.expense
  })) : [];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <AppLayout>
      <Header title="Dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="glass hover-lift" data-testid={`stat-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold font-mono tracking-tight" data-testid={`stat-value-${index}`}>
                    {stat.isCurrency === false ? stat.value : `₹${stat?.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="lg:col-span-5">
          <Card className="glass" data-testid="category-chart-card">
            <CardHeader>
              <CardTitle>Expense by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-7">
          <Card className="glass" data-testid="recent-transactions-card">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((txn, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-colors" data-testid={`transaction-item-${index}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${txn.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          {txn.type === 'income' ? (
                            <ArrowUp className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ArrowDown className="w-5 h-5 text-rose-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{txn.description || txn.category}</p>
                          <p className="text-sm text-muted-foreground">{txn.date}</p>
                        </div>
                      </div>
                      <p className={`font-mono font-semibold ${txn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {txn.type === 'income' ? '+' : '-'}₹{(txn?.amount ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="mt-4 text-primary hover:underline"
                    data-testid="add-first-transaction"
                  >
                    Add your first transaction
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Crypto Prices */}
      {cryptoData.length > 0 && (
        <Card className="glass mb-8" data-testid="crypto-prices-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Cryptocurrencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {cryptoData.map((coin, index) => (
                <div key={index} className="p-4 rounded-xl glass-strong" data-testid={`crypto-card-${index}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                    <div>
                      <p className="font-semibold">{coin.symbol.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{coin.name}</p>
                    </div>
                  </div>
                  <p className="text-xl font-mono font-bold mb-1">
                    ₹{(coin?.current_price ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  {coin.price_usd != null && (
                    <p className="text-xs text-muted-foreground">${coin.price_usd.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</p>
                  )}
                  <p className={`text-sm font-semibold ${coin.price_change_percentage_24h > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {coin.price_change_percentage_24h > 0 ? '+' : ''}{(coin?.price_change_percentage_24h ?? 0).toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Dashboard;