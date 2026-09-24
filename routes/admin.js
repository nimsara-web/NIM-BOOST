const express = require('express');
const router = express.Router();
const { User, Service, Order, Transaction } = require('../database');

function adminAuth(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
  next();
}

router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const [users, orders, pending, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$cost' } } }]),
    ]);
    const stats = {
      users: users || 0,
      orders: orders || 0,
      pending: pending || 0,
      revenue: (revenueAgg && revenueAgg[0] && revenueAgg[0].total) || 0,
    };
    const recentOrders = await Order.find()
      .populate('user', 'username')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
    res.render('admin/dashboard', { stats, recentOrders });
  } catch (e) {
    console.error('Admin dashboard error:', e.message);
    console.error(e.stack);
    res.status(500).send('Admin error: ' + e.message);
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.render('admin/users', { users });
});

router.post('/users/:id/balance', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  await User.findByIdAndUpdate(req.params.id, { $inc: { balance: amount } });
  await Transaction.create({
    user: req.params.id,
    amount,
    type: 'admin',
    note: 'Admin top-up',
  });
  res.redirect('/admin/users');
});

router.get('/orders', async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'username')
    .populate('service', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.render('admin/orders', { orders });
});

router.post('/orders/:id/status', async (req, res) => {
  await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.redirect('/admin/orders');
});

router.get('/services', async (req, res) => {
  const services = await Service.find().sort({ createdAt: -1 }).lean();
  res.render('admin/services', { services });
});

router.post('/services', async (req, res) => {
  const { category, name, price_per_1000, min_qty, max_qty } = req.body;
  await Service.create({
    category,
    name,
    price_per_1000: parseFloat(price_per_1000),
    min_qty: parseInt(min_qty),
    max_qty: parseInt(max_qty),
  });
  res.redirect('/admin/services');
});

router.post('/services/:id/toggle', async (req, res) => {
  const svc = await Service.findById(req.params.id);
  if (svc) {
    svc.active = !svc.active;
    await svc.save();
  }
  res.redirect('/admin/services');
});

router.post('/services/:id/delete', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.redirect('/admin/services');
});

module.exports = router;
