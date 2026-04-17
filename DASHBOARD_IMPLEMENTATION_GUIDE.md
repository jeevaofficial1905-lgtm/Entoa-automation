# Management Dashboard - Complete Implementation Guide

## Project Overview
Building a **Business/Sales + Inventory + Analytics Dashboard** for a medium team (10-50 users).

---

## PART 1: DATABASE SETUP

### Step 1.1: Choose & Create Database Host

**Recommended: Supabase (PostgreSQL + Free Tier)**
1. Go to https://supabase.com
2. Sign up (free account)
3. Create a new project
4. Copy connection string (looks like: `postgresql://user:password@host:5432/dbname`)

**Alternative Options:**
- Railway.app (simple deployment)
- Heroku Postgres (legacy, paid now)
- Google Cloud SQL
- AWS RDS

### Step 1.2: Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50), -- 'admin', 'manager', 'viewer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products/Inventory table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  category VARCHAR(100),
  quantity_in_stock INT DEFAULT 0,
  reorder_level INT,
  price DECIMAL(10, 2),
  supplier_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales/Orders table
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE,
  customer_name VARCHAR(255),
  total_amount DECIMAL(12, 2),
  status VARCHAR(50), -- 'pending', 'completed', 'cancelled'
  sale_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Items (breakdown of each sale)
CREATE TABLE sales_items (
  id SERIAL PRIMARY KEY,
  sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  quantity INT,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2)
);

-- Suppliers table
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Log (for tracking history)
CREATE TABLE inventory_log (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  quantity_change INT,
  reason VARCHAR(255), -- 'sale', 'restock', 'adjustment'
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_inventory_log_product ON inventory_log(product_id);
```

### Step 1.3: Insert Sample Data

```sql
-- Insert sample suppliers
INSERT INTO suppliers (name, email, phone, city, country) VALUES
('TechSupply Co', 'contact@techsupply.com', '9876543210', 'Bengaluru', 'India'),
('Local Distributor', 'local@dist.com', '9123456789', 'Bengaluru', 'India');

-- Insert sample products
INSERT INTO products (name, sku, category, quantity_in_stock, reorder_level, price, supplier_id) VALUES
('Laptop', 'TECH-001', 'Electronics', 25, 10, 45000.00, 1),
('Mouse', 'ACC-001', 'Accessories', 150, 50, 800.00, 1),
('Keyboard', 'ACC-002', 'Accessories', 85, 30, 1500.00, 2),
('Monitor', 'TECH-002', 'Electronics', 15, 5, 12000.00, 1),
('USB Cable', 'ACC-003', 'Accessories', 500, 200, 200.00, 2);

-- Insert sample sales
INSERT INTO sales (order_number, customer_name, total_amount, status, sale_date) VALUES
('ORD-001', 'Acme Corp', 50000.00, 'completed', '2024-04-10'),
('ORD-002', 'Tech Solutions', 35000.00, 'completed', '2024-04-12'),
('ORD-003', 'Digital Services', 15000.00, 'pending', '2024-04-15');

-- Insert sample sales items
INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 45000.00, 45000.00),
(1, 2, 5, 800.00, 4000.00),
(2, 3, 10, 1500.00, 15000.00),
(2, 4, 1, 12000.00, 12000.00),
(3, 2, 10, 800.00, 8000.00),
(3, 5, 10, 200.00, 2000.00);
```

---

## PART 2: BACKEND API (Node.js + Express)

### Step 2.1: Project Setup

```bash
mkdir dashboard-backend
cd dashboard-backend
npm init -y
npm install express pg dotenv cors bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

### Step 2.2: Create .env file

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_super_secret_key_here_change_in_production
PORT=5000
NODE_ENV=development
```

### Step 2.3: Create server.js

```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// ===== PRODUCTS ENDPOINTS =====

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.name as supplier_name 
      FROM products p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  const { name, sku, category, quantity_in_stock, reorder_level, price, supplier_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (name, sku, category, quantity_in_stock, reorder_level, price, supplier_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, sku, category, quantity_in_stock, reorder_level, price, supplier_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  const { name, sku, category, quantity_in_stock, reorder_level, price, supplier_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products 
       SET name=$1, sku=$2, category=$3, quantity_in_stock=$4, reorder_level=$5, price=$6, supplier_id=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, sku, category, quantity_in_stock, reorder_level, price, supplier_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SALES ENDPOINTS =====

// Get all sales with items
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sales_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sales by date range
app.get('/api/sales/range/:start/:end', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sales 
      WHERE sale_date BETWEEN $1 AND $2
      ORDER BY sale_date DESC
    `, [req.params.start, req.params.end]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sale
app.post('/api/sales', async (req, res) => {
  const { order_number, customer_name, total_amount, status, sale_date, items } = req.body;
  try {
    const saleResult = await pool.query(
      `INSERT INTO sales (order_number, customer_name, total_amount, status, sale_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [order_number, customer_name, total_amount, status, sale_date]
    );
    const saleId = saleResult.rows[0].id;

    // Insert sale items
    for (const item of items) {
      await pool.query(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, total_price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }

    res.status(201).json(saleResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ANALYTICS ENDPOINTS =====

// Dashboard statistics
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const totalRevenue = await pool.query(
      'SELECT SUM(total_amount) as total FROM sales WHERE status = $1',
      ['completed']
    );
    
    const totalOrders = await pool.query(
      'SELECT COUNT(*) as count FROM sales'
    );
    
    const lowStockProducts = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE quantity_in_stock <= reorder_level'
    );
    
    const totalProducts = await pool.query(
      'SELECT COUNT(*) as count FROM products'
    );

    res.json({
      total_revenue: totalRevenue.rows[0].total || 0,
      total_orders: totalOrders.rows[0].count,
      low_stock_products: lowStockProducts.rows[0].count,
      total_products: totalProducts.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by category
app.get('/api/analytics/sales-by-category', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.category, SUM(si.total_price) as total_sales, COUNT(DISTINCT si.sale_id) as order_count
      FROM sales_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.category
      ORDER BY total_sales DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly sales trend
app.get('/api/analytics/monthly-trend', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE_TRUNC('month', sale_date) as month, SUM(total_amount) as total_sales
      FROM sales
      WHERE status = 'completed'
      GROUP BY DATE_TRUNC('month', sale_date)
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SUPPLIERS ENDPOINTS =====

app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 2.4: Update package.json scripts

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### Step 2.5: Run the backend

```bash
npm run dev
```

Test endpoints at: `http://localhost:5000/api/health`

---

## PART 3: FRONTEND DASHBOARD (React)

### Step 3.1: Project Setup

```bash
npx create-react-app dashboard-frontend
cd dashboard-frontend
npm install axios recharts react-router-dom lucide-react
```

### Step 3.2: Create .env file

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3.3: Create folder structure

```
src/
├── components/
│   ├── Dashboard.jsx
│   ├── ProductsTable.jsx
│   ├── SalesTable.jsx
│   ├── Analytics.jsx
│   └── Navbar.jsx
├── pages/
├── utils/
│   └── api.js
├── App.jsx
└── index.css
```

### Step 3.4: Create utils/api.js

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Products
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Sales
export const getSales = () => api.get('/sales');
export const getSalesByDateRange = (start, end) => api.get(`/sales/range/${start}/${end}`);
export const createSale = (data) => api.post('/sales', data);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getSalesByCategory = () => api.get('/analytics/sales-by-category');
export const getMonthlyTrend = () => api.get('/analytics/monthly-trend');

// Suppliers
export const getSuppliers = () => api.get('/suppliers');

export default api;
```

---

## PART 4: DEPLOYMENT

### Step 4.1: Deploy Backend

**Option A: Railway (Recommended)**
1. Go to https://railway.app
2. Create account, connect GitHub
3. Import your backend repo
4. Set environment variables (DATABASE_URL, JWT_SECRET)
5. Deploy

**Option B: Heroku**
```bash
heroku login
heroku create dashboard-api
git push heroku main
```

### Step 4.2: Deploy Frontend

**Vercel**
1. Go to https://vercel.com
2. Import your React repo
3. Set REACT_APP_API_URL to your deployed backend URL
4. Deploy

---

## PART 5: FEATURES TO ADD NEXT

- [ ] User authentication (Login/Signup)
- [ ] Role-based access control (Admin/Manager/Viewer)
- [ ] Inventory alerts (Low stock notifications)
- [ ] Export to CSV/Excel
- [ ] Advanced filtering & search
- [ ] Real-time notifications
- [ ] User activity logs
- [ ] Dark mode
- [ ] Mobile-responsive design
- [ ] Email reports (scheduled)

---

## QUICK CHECKLIST

- [ ] Database created and seeded with sample data
- [ ] Backend running locally on port 5000
- [ ] Frontend running locally on port 3000
- [ ] All API endpoints tested with Postman
- [ ] Database connected to backend successfully
- [ ] Dashboard displays sample data
- [ ] Responsive design verified
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Production environment variables set

---

## TROUBLESHOOTING

**Backend won't connect to database?**
- Check DATABASE_URL is correct
- Verify network access in database settings
- Test with: `psql postgresql://...`

**CORS errors?**
- Make sure backend has `cors()` middleware
- Update REACT_APP_API_URL to deployed backend URL

**React can't fetch data?**
- Check browser console for errors
- Verify API_URL in .env
- Test backend endpoints with curl/Postman

---

Good luck! This is a scalable foundation you can build on. 🚀
