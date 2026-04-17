import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, categoryRes, trendRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/sales-by-category'),
          api.get('/analytics/monthly-trend')
        ]);

        setSummary(summaryRes.data);
        setCategoryData(categoryRes.data);
        setTrendData(trendRes.data.reverse());
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading dashboard...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Business & Inventory Management Overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ₹{(summary?.total_revenue || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="text-blue-500" size={40} />
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summary?.total_orders || 0}
                </p>
              </div>
              <ShoppingCart className="text-green-500" size={40} />
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Products</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summary?.total_products || 0}
                </p>
              </div>
              <Package className="text-purple-500" size={40} />
            </div>
          </div>

          {/* Low Stock Alert Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Low Stock Products</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summary?.low_stock_products || 0}
                </p>
              </div>
              <AlertCircle className="text-red-500" size={40} />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Monthly Sales Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                />
                <YAxis />
                <Tooltip formatter={(val) => `₹${val}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_sales" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sales by Category */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Sales by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, order_count }) => `${category}: ${order_count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_sales"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${val}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Category Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Sales</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">{item.category}</td>
                    <td className="px-4 py-3 text-right text-slate-700">₹{item.total_sales.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.order_count}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      ₹{(item.total_sales / item.order_count).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
