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
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

const Invoices = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    gst_number: '',
    client_name: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    gst_amount: 0,
    total: 0,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const response = await api.getInvoices();
      setInvoices(response.data);
    } catch (error) {
      console.error('Fetch invoices error:', error);
      toast.error('Failed to load invoices');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    const gst_amount = subtotal * 0.18; // 18% GST
    const total = subtotal + gst_amount;
    
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      gst_amount,
      total
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createInvoice(formData);
      toast.success('Invoice created successfully');
      setIsModalOpen(false);
      setFormData({
        invoice_number: '',
        gst_number: '',
        client_name: '',
        items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        subtotal: 0,
        gst_amount: 0,
        total: 0,
        date: new Date().toISOString().split('T')[0]
      });
      fetchInvoices();
    } catch (error) {
      console.error('Create invoice error:', error);
      toast.error('Failed to create invoice');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <AppLayout>
      <Header title="GST Invoices" />

      <div className="flex justify-end mb-6">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-invoice-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create GST Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    placeholder="INV-001"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    required
                    data-testid="invoice-number-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gst_number">GST Number (Optional)</Label>
                  <Input
                    id="gst_number"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    data-testid="gst-number-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    placeholder="ABC Company Pvt Ltd"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    required
                    data-testid="client-name-input"
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
                    data-testid="invoice-date-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="add-item-button">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2" data-testid={`invoice-item-${index}`}>
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="col-span-5"
                      data-testid={`item-description-${index}`}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="col-span-2"
                      data-testid={`item-quantity-${index}`}
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="col-span-2"
                      data-testid={`item-rate-${index}`}
                    />
                    <div className="col-span-3 flex items-center px-3 rounded-lg glass-strong font-mono" data-testid={`item-amount-${index}`}>
                      ₹{item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-mono" data-testid="invoice-subtotal">₹{formData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span className="font-mono" data-testid="invoice-gst">₹{formData.gst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="font-mono" data-testid="invoice-total">₹{formData.total.toFixed(2)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" data-testid="submit-invoice-button">
                Create Invoice
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass" data-testid="invoices-list-card">
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl glass-strong hover:bg-accent/50 transition-colors"
                  data-testid={`invoice-row-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold" data-testid={`invoice-number-${index}`}>{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {invoice.date} {invoice.gst_number && `• GST: ${invoice.gst_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono font-bold" data-testid={`invoice-amount-${index}`}>
                        ₹{invoice.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">+GST ₹{invoice.gst_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No invoices found</p>
              <Button onClick={() => setIsModalOpen(true)} data-testid="no-invoices-create-button">
                Create Your First Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Invoices;