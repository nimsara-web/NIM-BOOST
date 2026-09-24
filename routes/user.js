const express = require('express');
const router = express.Router();
const db = require('../database');

function auth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.session.user.id);
  const orders = db.prepare("SELECT o.*, s.name as service_name FROM orders o JOIN services s ON s.id=o.service_id WHERE o.user_id=? ORDER BY o.id DESC LIMIT 10").all(user.id);
  res.render('dashboard', { user, orders });
});

router.get('/new-order', auth, (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE active=1").all();
  res.render('new-order', { services, error: null, success: null });
});

router.post('/new-order', auth, (req, res) => {
  const { service_id, link, quantity } = req.body;
  const services = db.prepare("SELECT * FROM services WHERE active=1").all();
  try {
    const svc = db.prepare("SELECT * FROM services WHERE id=?").get(service_id);
    const qty = parseInt(quantity);
    if (!svc) throw new Error('Invalid service');
    if (!link) throw new Error('Link required');
    if (qty < svc.min_qty || qty > svc.max_qty) throw new Error(`Qty must be ${svc.min_qty}-${svc.max_qty}`);
    const cost = (svc.price_per_1000 / 1000) * qty;
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.session.user.id);
    if (user.balance < cost) throw new Error('Insufficient balance. Contact admin to top-up.');
    db.prepare("UPDATE users SET balance = balance - ? WHERE id=?").run(cost, user.id);
    db.prepare("INSERT INTO orders (user_id,service_id,link,quantity,cost) VALUES (?,?,?,?,?)").run(user.id, svc.id, link, qty, cost);
    db.prepare("INSERT INTO transactions (user_id,amount,type,note) VALUES (?,?,?,?)").run(user.id, -cost, 'order', `Order #${svc.name}`);
    res.render('new-order', { services, error: null, success: `Order placed! Cost: $${cost.toFixed(4)}` });
  } catch (e) {
    res.render('new-order', { services, error: e.message, success: null });
  }
});

router.get('/orders', auth, (req, res) => {
  const orders = db.prepare("SELECT o.*, s.name as service_name FROM orders o JOIN services s ON s.id=o.service_id WHERE o.user_id=? ORDER BY o.id DESC").all(req.session.user.id);
  res.render('orders', { orders });
});

module.exports = router;
