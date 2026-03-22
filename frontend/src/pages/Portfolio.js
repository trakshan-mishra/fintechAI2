import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  TrendingUp, TrendingDown, Plus, Upload, Trash2, Brain,
  Bitcoin, BarChart3, Zap, RefreshCw, Sparkles, FileText, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const NativeSelect = ({ value, onChange, children, className = '' }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className={`w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}>
    {children}
  </select>
);

const Portfolio = () => {
  const navigate = useNavigate();
  const { user, loading, getAuthToken } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSource, setImportSource] = useState('groww');
  const [newHolding, setNewHolding] = useState({
    symbol: '', name: '', asset_type: 'stock', quantity: '', avg_buy_price: '', exchange: 'NSE'
  });

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchHoldings();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const getHeaders = async () => {
    const token = await getAuthToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchHoldings = async () => {
    setLoadingHoldings(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio`, { headers: await getHeaders() });
      const data = await res.json();
      setHoldings(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load portfolio'); }
    finally { setLoadingHoldings(false); }
  };

  const addHolding = async (e) => {
    e.preventDefault();
    if (!newHolding.symbol || !newHolding.quantity || !newHolding.avg_buy_price) {
      toast.error('Fill in all required fields'); return;
    }
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/portfolio/import`, {
        method: 'POST', headers,
        body: JSON.stringify({
          source: 'manual',
          holdings: [{
            symbol: newHolding.symbol.toUpperCase(),
            name: newHolding.name || newHolding.symbol.toUpperCase(),
            asset_type: newHolding.asset_type,
            quantity: parseFloat(newHolding.quantity),
            avg_buy_price: parseFloat(newHolding.avg_buy_price),
            exchange: newHolding.exchange,
          }, ...holdings.map(h => ({
            symbol: h.symbol, name: h.name, asset_type: h.asset_type,
            quantity: h.quantity, avg_buy_price: h.avg_buy_price, exchange: h.exchange || 'NSE'
          }))]
        })
      });
      if (res.ok) {
        toast.success('Holding added!');
        setIsAddOpen(false);
        setNewHolding({ symbol: '', name: '', asset_type: 'stock', quantity: '', avg_buy_price: '', exchange: 'NSE' });
        fetchHoldings();
      }
    } catch { toast.error('Failed to add holding'); }
  };

  const deleteHolding = async (holdingId) => {
    try {
      const headers = await getHeaders();
      await fetch(`${API_BASE}/portfolio/${holdingId}`, { method: 'DELETE', headers });
      toast.success('Holding removed');
      fetchHoldings();
    } catch { toast.error('Failed to delete'); }
  };

  const importCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/portfolio/import/csv?source=${importSource}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.imported} holdings from ${importSource}!`);
        setIsImportOpen(false);
        fetchHoldings();
      } else {
        toast.error('Import failed');
      }
    } catch { toast.error('Import failed'); }
  };

  const getAIRecommendations = async () => {
    setLoadingAI(true);
    setAiAnalysis('');
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/portfolio/ai-recommendations`, { method: 'POST', headers });
      const data = await res.json();
      setAiAnalysis(data.analysis || 'No analysis available');
    } catch { toast.error('Failed to get AI recommendations'); }
    finally { setLoadingAI(false); }
  };

  // Compute portfolio stats
  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const assetTypeBreakdown = holdings.reduce((acc, h) => {
    const type = h.asset_type || 'stock';
    acc[type] = (acc[type] || 0) + h.quantity * h.avg_buy_price;
    return acc;
  }, {});
  const pieData = Object.entries(assetTypeBreakdown).map(([name, value]) => ({ name, value: Math.round(value) }));

  const typeIcon = (type) => {
    if (type === 'crypto') return <Bitcoin className="w-4 h-4 text-orange-500" />;
    if (type === 'commodity') return <Zap className="w-4 h-4 text-yellow-500" />;
    return <BarChart3 className="w-4 h-4 text-blue-500" />;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <AppLayout>
      <Header title="My Portfolio" />

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Invested</p>
            <p className="text-3xl font-mono font-bold text-primary">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Holdings</p>
            <p className="text-3xl font-mono font-bold">{holdings.length}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Asset Types</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {Object.entries(assetTypeBreakdown).map(([type, val]) => (
                <span key={type} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary capitalize">
                  {type}: {((val / totalInvested) * 100).toFixed(0)}%
                </span>
              ))}
              {holdings.length === 0 && <span className="text-muted-foreground text-sm">No holdings yet</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="holdings">
        <TabsList className="glass mb-4">
          <TabsTrigger value="holdings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Holdings</TabsTrigger>
          <TabsTrigger value="allocation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Allocation</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-1" />AI Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Holdings Tab */}
        <TabsContent value="holdings">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />Add Holding</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong">
                <DialogHeader><DialogTitle>Add Holding</DialogTitle></DialogHeader>
                <form onSubmit={addHolding} className="space-y-3">
                  <div><Label>Asset Type</Label>
                    <NativeSelect value={newHolding.asset_type} onChange={v => setNewHolding({ ...newHolding, asset_type: v })}>
                      <option value="stock">Stock (NSE/BSE)</option>
                      <option value="crypto">Cryptocurrency</option>
                      <option value="commodity">Commodity</option>
                    </NativeSelect>
                  </div>
                  <div><Label>Symbol *</Label>
                    <Input placeholder="e.g. RELIANCE / BTC / GOLD" value={newHolding.symbol}
                      onChange={e => setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })} required />
                  </div>
                  <div><Label>Name</Label>
                    <Input placeholder="e.g. Reliance Industries" value={newHolding.name}
                      onChange={e => setNewHolding({ ...newHolding, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Quantity *</Label>
                      <Input type="number" step="any" placeholder="10" value={newHolding.quantity}
                        onChange={e => setNewHolding({ ...newHolding, quantity: e.target.value })} required />
                    </div>
                    <div><Label>Avg Buy Price (₹) *</Label>
                      <Input type="number" step="any" placeholder="2500" value={newHolding.avg_buy_price}
                        onChange={e => setNewHolding({ ...newHolding, avg_buy_price: e.target.value })} required />
                    </div>
                  </div>
                  {newHolding.asset_type === 'stock' && (
                    <div><Label>Exchange</Label>
                      <NativeSelect value={newHolding.exchange} onChange={v => setNewHolding({ ...newHolding, exchange: v })}>
                        <option value="NSE">NSE</option>
                        <option value="BSE">BSE</option>
                      </NativeSelect>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    <p className="font-medium">Investment Value:</p>
                    <p className="text-primary font-mono">₹{((parseFloat(newHolding.quantity)||0) * (parseFloat(newHolding.avg_buy_price)||0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <Button type="submit" className="w-full">Add to Portfolio</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Upload className="w-4 h-4" />Import from Groww / Zerodha</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong max-w-md">
                <DialogHeader><DialogTitle>Import Portfolio</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted flex gap-2">
                    <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">Download your portfolio CSV from your broker and upload it here.</p>
                  </div>
                  <div><Label>Source</Label>
                    <NativeSelect value={importSource} onChange={setImportSource}>
                      <option value="groww">Groww</option>
                      <option value="zerodha">Zerodha / Kite</option>
                      <option value="upstox">Upstox</option>
                      <option value="angelone">Angel One</option>
                      <option value="csv">Generic CSV</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label>Upload CSV File</Label>
                    <Input type="file" accept=".csv" onChange={importCSV} />
                  </div>
                  <div className="p-3 rounded-lg glass-strong text-sm space-y-1">
                    <p className="font-medium">CSV Format Required:</p>
                    <p className="text-muted-foreground text-xs">Headers: symbol, name, quantity, avg cost (or avg buy price)</p>
                    <p className="text-muted-foreground text-xs font-mono">RELIANCE, Reliance Industries, 10, 2456.75</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                    <p className="font-medium text-blue-400">How to export from Groww:</p>
                    <p className="text-muted-foreground text-xs mt-1">Groww App → Portfolio → ⋮ menu → Export Holdings</p>
                    <p className="font-medium text-blue-400 mt-2">How to export from Zerodha:</p>
                    <p className="text-muted-foreground text-xs mt-1">console.zerodha.com → Portfolio → Download</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={fetchHoldings} disabled={loadingHoldings} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loadingHoldings ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {holdings.length > 0 ? (
            <Card className="glass">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Asset</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Type</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Qty</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Avg Price</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Invested</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Source</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => {
                        const invested = h.quantity * h.avg_buy_price;
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {typeIcon(h.asset_type)}
                                <div>
                                  <p className="font-bold">{h.symbol}</p>
                                  <p className="text-xs text-muted-foreground">{h.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right"><span className="capitalize text-xs px-2 py-1 rounded bg-primary/10 text-primary">{h.asset_type}</span></td>
                            <td className="p-4 text-right font-mono">{h.quantity.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right font-mono">₹{h.avg_buy_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono font-bold">₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                            <td className="p-4 text-right text-xs text-muted-foreground capitalize">{h.source}</td>
                            <td className="p-4">
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteHolding(h.holding_id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="p-4 font-bold">Total Portfolio Value</td>
                        <td className="p-4 text-right font-mono font-bold text-primary">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardContent className="p-16 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-xl font-bold mb-2">No holdings yet</h3>
                <p className="text-muted-foreground mb-6">Add your stocks, crypto, and commodities to track your portfolio</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={() => setIsAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add Manually</Button>
                  <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2"><Upload className="w-4 h-4" />Import from Groww</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Allocation Tab */}
        <TabsContent value="allocation">
          {holdings.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass">
                <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader><CardTitle>Holdings Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {holdings.sort((a, b) => (b.quantity * b.avg_buy_price) - (a.quantity * a.avg_buy_price)).map((h, i) => {
                    const val = h.quantity * h.avg_buy_price;
                    const pct = totalInvested > 0 ? (val / totalInvested) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">{typeIcon(h.asset_type)}<span className="font-medium text-sm">{h.symbol}</span></div>
                          <div className="text-right">
                            <span className="font-mono text-sm">₹{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs text-muted-foreground ml-2">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass"><CardContent className="p-16 text-center text-muted-foreground">
              <p>Add holdings to see allocation charts</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai">
          <div className="space-y-4">
            <Card className="glass border border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10"><Brain className="w-8 h-8 text-primary" /></div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">AI Portfolio Advisor</h3>
                    <p className="text-muted-foreground text-sm mb-4">Get personalized buy/sell/hold recommendations, bullish/bearish signals, and portfolio rebalancing advice based on your actual holdings and current Indian market conditions.</p>
                    <Button onClick={getAIRecommendations} disabled={loadingAI || holdings.length === 0} size="lg" className="gap-2">
                      <Sparkles className="w-5 h-5" />
                      {loadingAI ? 'Analyzing your portfolio...' : holdings.length === 0 ? 'Add holdings first' : 'Get AI Recommendations'}
                    </Button>
                    {holdings.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">Add your holdings in the Holdings tab first for personalized analysis.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingAI && (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing your portfolio against current market conditions...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 10-15 seconds</p>
                </CardContent>
              </Card>
            )}

            {aiAnalysis && !loadingAI && (
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Portfolio Analysis & Recommendations</CardTitle>
                    <Button variant="outline" size="sm" onClick={getAIRecommendations} className="gap-1">
                      <RefreshCw className="w-4 h-4" />Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    AI-generated analysis based on publicly available market information. Not SEBI-registered investment advice. Consult a financial advisor before making investment decisions.
                  </div>
                </CardContent>
              </Card>
            )}

            {!aiAnalysis && !loadingAI && holdings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🟢', title: 'What AI Analyzes', items: ['Current bullish/bearish signals', 'Buy/Sell/Hold for each holding', 'Best entry/exit price targets'] },
                  { icon: '📊', title: 'Portfolio Insights', items: ['Portfolio health score (0-100)', 'Diversification analysis', 'Risk assessment'] },
                  { icon: '💡', title: 'Action Plan', items: ['Top 3 actions this week', 'Rebalancing suggestions', 'Tax-efficient strategies (LTCG/STCG)'] },
                ].map(({ icon, title, items }) => (
                  <Card key={title} className="glass">
                    <CardContent className="p-4">
                      <p className="text-2xl mb-2">{icon}</p>
                      <p className="font-bold mb-2">{title}</p>
                      <ul className="space-y-1">
                        {items.map(item => <li key={item} className="text-xs text-muted-foreground">• {item}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Portfolio;