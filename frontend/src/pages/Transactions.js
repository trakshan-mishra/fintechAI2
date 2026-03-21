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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, ArrowUp, ArrowDown, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const Transactions = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType]);

  const fetchTransactions = async () => {
    try {
      const filters = filterType !== 'all' ? { type: filterType } : {};
      const response = await api.getTransactions(filters);
      setTransactions(response.data);
    } catch (error) {
      console.error('Fetch transactions error:', error);
      toast.error('Failed to load transactions');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.createTransaction({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      toast.success('Transaction added successfully');
      
      // Send Telegram notification if connected
      try {
        await api.sendTransactionAlert(response.data.transaction_id);
      } catch (notifError) {
        // Silently fail if telegram not connected
        console.log('Telegram notification not sent:', notifError);
      }
      
      setIsAddModalOpen(false);
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error) {
      console.error('Create transaction error:', error);
      toast.error('Failed to add transaction');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTransaction(id);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (error) {
      console.error('Delete transaction error:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await api.importPaytm(file);
      toast.success('Transactions imported successfully');
      setIsImportModalOpen(false);
      fetchTransactions();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import transactions');
    }
  };

  const categories = ['Salary', 'Freelance', 'Investment', 'Food', 'Transport', 'Shopping', 'Bills', 'Healthcare', 'Entertainment', 'Others'];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <AppLayout>
      <Header title="Transactions" />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-48 glass" data-testid="filter-type-select">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="income">Income Only</SelectItem>
            <SelectItem value="expense">Expenses Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="glass" data-testid="import-button">
                <Upload className="w-4 h-4 mr-2" />
                Import Paytm
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>Import Paytm Transactions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Label htmlFor="csv-upload">Upload CSV File</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  data-testid="csv-file-input"
                />
                <p className="text-sm text-muted-foreground">
                  Upload your Paytm transaction history CSV file to automatically import all transactions.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-transaction-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger data-testid="transaction-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    data-testid="amount-input"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="E.g., Coffee at Starbucks"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="description-input"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="date-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-transaction-button">
                  Add Transaction
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass" data-testid="transactions-list-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl glass-strong hover:bg-accent/50 transition-colors"
                  data-testid={`transaction-row-${index}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${txn.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {txn.type === 'income' ? (
                        <ArrowUp className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ArrowDown className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{txn.description || txn.category}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{txn.category}</span>
                        <span>•</span>
                        <span>{txn.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-mono font-bold text-lg ${txn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(txn.transaction_id)}
                      className="text-destructive hover:bg-destructive/10"
                      data-testid={`delete-transaction-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <p className="mb-4">No transactions found</p>
              <Button onClick={() => setIsAddModalOpen(true)} data-testid="no-transactions-add-button">
                Add Your First Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Transactions;