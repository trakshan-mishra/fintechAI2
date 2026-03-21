import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calculator, TrendingUp, TrendingDown, FileText, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TaxSummary = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [taxData, setTaxData] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTaxSummary();
    }
  }, [user]);

  const fetchTaxSummary = async () => {
    try {
      const response = await api.getTaxSummary();
      setTaxData(response.data);
    } catch (error) {
      console.error('Fetch tax summary error:', error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const chartData = taxData ? [
    { name: 'Income', value: taxData.total_income },
    { name: 'Expenses', value: taxData.total_expense },
    { name: 'Taxable Income', value: taxData.taxable_income },
    { name: 'Estimated Tax', value: taxData.estimated_tax }
  ] : [];

  const stats = [
    {
      title: 'Total Income',
      value: taxData?.total_income || 0,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Total Deductions',
      value: taxData?.deductions || 0,
      icon: TrendingDown,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Taxable Income',
      value: taxData?.taxable_income || 0,
      icon: Calculator,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Estimated Tax',
      value: taxData?.estimated_tax || 0,
      icon: FileText,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    },
    {
      title: 'GST Collected',
      value: taxData?.gst_collected || 0,
      icon: Calculator,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10'
    }
  ];

  return (
    <AppLayout>
      <Header title="Tax Summary" />

      <div className="mb-8">
        <Card className="glass-strong border-l-4 border-l-orange-500" data-testid="tax-info-banner">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">Tax Information</h3>
                <p className="text-muted-foreground">
                  This is an estimated tax calculation based on your income and expenses. 
                  The calculations assume standard deductions and 30% tax rate above ₹10,00,000. 
                  Please consult with a tax professional for accurate tax filing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="glass hover-lift" data-testid={`tax-stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold font-mono" data-testid={`tax-stat-value-${index}`}>
                  ₹{stat.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass mb-8" data-testid="tax-breakdown-chart">
        <CardHeader>
          <CardTitle>Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass" data-testid="tax-slabs-card">
          <CardHeader>
            <CardTitle>Income Tax Slabs (New Regime)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>Up to ₹3,00,000</span>
                <span className="font-mono font-bold">Nil</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>₹3,00,001 - ₹6,00,000</span>
                <span className="font-mono font-bold">5%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>₹6,00,001 - ₹9,00,000</span>
                <span className="font-mono font-bold">10%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>₹9,00,001 - ₹12,00,000</span>
                <span className="font-mono font-bold">15%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>₹12,00,001 - ₹15,00,000</span>
                <span className="font-mono font-bold">20%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg glass-strong">
                <span>Above ₹15,00,000</span>
                <span className="font-mono font-bold">30%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass" data-testid="gst-info-card">
          <CardHeader>
            <CardTitle>GST Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">GST Collected This Year</p>
                <p className="text-3xl font-mono font-bold" data-testid="gst-collected-value">
                  ₹{(taxData?.gst_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">GST Rates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded glass-strong">
                    <span>Goods (Standard)</span>
                    <span className="font-mono font-bold">18%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded glass-strong">
                    <span>Services (Standard)</span>
                    <span className="font-mono font-bold">18%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded glass-strong">
                    <span>Luxury Items</span>
                    <span className="font-mono font-bold">28%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded glass-strong">
                    <span>Essential Goods</span>
                    <span className="font-mono font-bold">5%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TaxSummary;