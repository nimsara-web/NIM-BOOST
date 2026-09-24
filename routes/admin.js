const express = require('express');
const router = express.Router();
const db = require('../database');

function adminAuth(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
  next();
}

router.use(adminAuth);

router.get('/', (req, res) => {
  const stats = {
    users: db.prepare("SELECT COUNT(*) c FROM users WHERE role='user'").get().c,
    orders: db.prepare("SELECT COUNT(*) c FROM orders").get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM orders WHERE status='pending'").get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(cost),0) s FROM orders").get().s
  };
  const recentOrders = db.prepare("SELECT o.*, u.username, s.name as service_name FROM orders o JOIN users u ON u.id=o.user_id JOIN services s ON s.id=o.service_id ORDER BY o.id DESC LIMIT 15").all();
  res.render('admin/dashboard', { stats, recentOrders });
});

router.get('/users', (req, res) => {
  const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
  res.render('admin/users', { users });
});

router.post('/users/:id/balance', (req, res) => {
  const { amount } = req.body;
  db.prepare("UPDATE users SET balance = balance + ? WHERE id=?").run(parseFloat(amount), req.params.id);
  db.prepare("INSERT INTO transactions (user_id,amount,type,note) VALUES (?,?,?,?)").run(req.params.id, parseFloat(amount), 'admin', 'Admin top-up');
  res.redirect('/admin/users');
});

router.get('/orders', (req, res) => {
  const orders = db.prepare("SELECT o.*, u.username, s.name as service_name FROM orders o JOIN users u ON u.id=o.user_id JOIN services s ON s.id=o.service_id ORDER BY o.id DESC").all();
  res.render('admin/orders', { orders });
});

router.post('/orders/:id/status', (req, res) => {
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, req.params.id);
  res.redirect('/admin/orders');
});

router.get('/services', (req, res) => {
  const services = db.prepare("SELECT * FROM services ORDER BY id DESC").all();
  res.render('admin/services', { services });
});

router.post('/services', (req, res) => {
  const { category, name, price_per_1000, min_qty, max_qty } = req.body;
  db.prepare("INSERT INTO services (category,name,price_per_1000,min_qty,max_qty) VALUES (?,?,?,?,?)").run(category, name, parseFloat(price_per_1000), parseInt(min_qty), parseInt(max_qty));
  res.redirect('/admin/services');
});

router.post('/services/:id/toggle', (req, res) => {
  db.prepare("UPDATE services SET active = 1 - active WHERE id=?").run(req.params.id);
  res.redirect('/admin/services');
});

router.post('/services/:id/delete', (req, res) => {
  db.prepare("DELETE FROM services WHERE id=?").run(req.params.id);
  res.redirect('/admin/services');
});

module.exports = router;
