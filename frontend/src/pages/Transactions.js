import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, ArrowUp, ArrowDown, Trash2, Upload, Eye, Calendar, Tag, FileText, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

// Native select avoids ResizeObserver Radix UI loop bug
const NativeSelect = ({ value, onChange, children, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
  >
    {children}
  </select>
);

const Transactions = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [formData, setFormData] = useState({
    type: 'expense', amount: '', category: '', description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTransactions = async () => {
    try {
      const filters = filterType !== 'all' ? { type: filterType } : {};
      const response = await api.getTransactions(filters);
      setTransactions(response.data);
    } catch { toast.error('Failed to load transactions'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) { toast.error('Please select a category'); return; }
    try {
      const response = await api.createTransaction({ ...formData, amount: parseFloat(formData.amount) });
      toast.success('Transaction added!');
      try { await api.sendTransactionAlert(response.data.transaction_id); } catch {}
      setIsAddModalOpen(false);
      setFormData({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchTransactions();
    } catch { toast.error('Failed to add transaction'); }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.deleteTransaction(id);
      toast.success('Transaction deleted');
      setSelectedTxn(null);
      fetchTransactions();
    } catch { toast.error('Failed to delete transaction'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.importPaytm(file);
      toast.success('Imported successfully');
      setIsImportModalOpen(false);
      fetchTransactions();
    } catch { toast.error('Import failed'); }
  };

  const categories = ['Salary','Freelance','Investment','Food','Transport','Shopping','Bills','Healthcare','Entertainment','Others'];
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <AppLayout>
      <Header title="Transactions" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Income', val: totalIncome, color: 'emerald', icon: ArrowUp },
          { label: 'Total Expenses', val: totalExpense, color: 'rose', icon: ArrowDown },
          { label: 'Net Balance', val: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'emerald' : 'rose', icon: IndianRupee },
        ].map(({ label, val, color, icon: Icon }) => (
          <Card key={label} className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-${color}-500/10`}><Icon className={`w-5 h-5 text-${color}-500`} /></div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-xl font-mono font-bold text-${color}-500`}>₹{Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <NativeSelect value={filterType} onChange={setFilterType} className="w-full md:w-48">
          <option value="all">All Transactions</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </NativeSelect>
        <div className="flex gap-2 ml-auto">
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild><Button variant="outline" className="glass"><Upload className="w-4 h-4 mr-2" />Import Paytm</Button></DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Import Paytm Transactions</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Label>Upload CSV File</Label>
                <Input type="file" accept=".csv" onChange={handleImport} />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Transaction</Button></DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label>Type</Label>
                  <NativeSelect value={formData.type} onChange={(v) => setFormData({ ...formData, type: v })}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </NativeSelect>
                </div>
                <div><Label>Amount (₹)</Label>
                  <Input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div><Label>Category</Label>
                  <NativeSelect value={formData.category} onChange={(v) => setFormData({ ...formData, category: v })}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </NativeSelect>
                </div>
                <div><Label>Description (Optional)</Label>
                  <Input placeholder="E.g., Coffee at Starbucks" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div><Label>Date</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full">Add Transaction</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle>Transaction History ({transactions.length})</CardTitle></CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl glass-strong hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setSelectedTxn(txn)}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${txn.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {txn.type === 'income' ? <ArrowUp className="w-5 h-5 text-emerald-500" /> : <ArrowDown className="w-5 h-5 text-rose-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{txn.description || txn.category}</p>
                      <p className="text-sm text-muted-foreground">{txn.category} • {txn.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-mono font-bold text-lg ${txn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </p>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTxn(txn); }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(txn.transaction_id, e)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <p className="mb-4">No transactions found</p>
              <Button onClick={() => setIsAddModalOpen(true)}>Add Your First Transaction</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTxn} onOpenChange={() => setSelectedTxn(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${selectedTxn?.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {selectedTxn?.type === 'income' ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <ArrowDown className="w-4 h-4 text-rose-500" />}
              </div>
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl glass text-center">
                <p className={`text-4xl font-mono font-bold ${selectedTxn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {selectedTxn.type === 'income' ? '+' : '-'}₹{selectedTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedTxn.type}</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Tag, label: 'Category', value: selectedTxn.category },
                  { icon: Calendar, label: 'Date', value: new Date(selectedTxn.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  ...(selectedTxn.description ? [{ icon: FileText, label: 'Description', value: selectedTxn.description }] : []),
                  { icon: FileText, label: 'Transaction ID', value: selectedTxn.transaction_id, mono: true },
                ].map(({ icon: Icon, label, value, mono }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg glass-strong">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">{label}</p><p className={`font-semibold ${mono ? 'font-mono text-xs' : ''}`}>{value}</p></div>
                  </div>
                ))}
              </div>
              <Button variant="destructive" className="w-full" onClick={(e) => handleDelete(selectedTxn.transaction_id, e)}>
                <Trash2 className="w-4 h-4 mr-2" />Delete Transaction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Transactions;