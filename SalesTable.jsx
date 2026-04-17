import React, { useState, useEffect } from 'react';
import { Plus, Eye } from 'lucide-react';
import api from '../utils/api';

const SalesTable = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    status: 'pending',
    sale_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products')
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      handleItemChange(index, 'product_id', productId);
      handleItemChange(index, 'unit_price', product.price);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const saleData = {
        ...formData,
        total_amount: calculateTotal(),
        items: formData.items.filter(item => item.product_id)
      };
      await api.post('/sales', saleData);
      fetchData();
      resetForm();
    } catch (err) {
      console.error('Error creating sale:', err);
      alert('Error creating sale');
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      customer_name: '',
      status: 'pending',
      sale_date: new Date().toISOString().split('T')[0],
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    });
    setShowForm(false);
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Sales Orders</h1>
            <p className="text-slate-600">Track and manage sales transactions</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={20} /> New Sale
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 w-full max-w-2xl my-8">
              <h2 className="text-2xl font-bold mb-6">Create New Sale</h2>
              <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Order Number"
                    value={formData.order_number}
                    onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                    required
                    className="px-4 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                    className="px-4 py-2 border rounded-lg"
                  />
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                    className="px-4 py-2 border rounded-lg"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3">Sale Items</h3>
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="px-4 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                        placeholder="Qty"
                        className="px-4 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value))}
                        placeholder="Price"
                        className="px-4 py-2 border rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="bg-red-100 text-red-700 px-2 py-2 rounded-lg text-sm hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Total */}
                <div className="bg-slate-100 p-4 rounded-lg mb-6">
                  <p className="text-lg font-bold text-slate-900">
                    Total Amount: ₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Create Sale
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Order #</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Amount</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Items</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900 font-semibold">{sale.order_number}</td>
                    <td className="px-6 py-4 text-slate-700">{sale.customer_name}</td>
                    <td className="px-6 py-4 text-slate-700">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                      ₹{sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{sale.item_count} items</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-slate-600 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-blue-600">{filteredSales.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-slate-600 text-sm">Pending Orders</p>
            <p className="text-3xl font-bold text-yellow-600">{filteredSales.filter(s => s.status === 'pending').length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-slate-600 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">
              ₹{filteredSales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesTable;
