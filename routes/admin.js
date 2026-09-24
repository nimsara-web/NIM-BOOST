const express = require('express');
const router = express.Router();
const { User, Service, Order, Transaction } = require('../database');

// ============ ADMIN AUTH ============
function adminAuth(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

router.use(adminAuth);

// ============ ADMIN DASHBOARD ============
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

// ============ USERS ============
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.render('admin/users', { users });
  } catch (e) {
    console.error('Admin users error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

router.post('/users/:id/balance', async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount)) return res.redirect('/admin/users');

    await User.findByIdAndUpdate(req.params.id, { $inc: { balance: amount } });
    await Transaction.create({
      user: req.params.id,
      amount,
      type: 'admin',
      note: 'Admin top-up',
    });
    res.redirect('/admin/users');
  } catch (e) {
    console.error('Balance update error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

// ============ ORDERS ============
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.render('admin/orders', { orders });
  } catch (e) {
    console.error('Admin orders error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

router.post('/orders/:id/status', async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect('/admin/orders');
  } catch (e) {
    console.error('Order status error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

// ============ SERVICES ============
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 }).lean();
    res.render('admin/services', { services });
  } catch (e) {
    console.error('Admin services error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

router.post('/services', async (req, res) => {
  try {
    const { category, name, price_per_1000, min_qty, max_qty } = req.body;
    await Service.create({
      category,
      name,
      price_per_1000: parseFloat(price_per_1000),
      min_qty: parseInt(min_qty),
      max_qty: parseInt(max_qty),
    });
    res.redirect('/admin/services');
  } catch (e) {
    console.error('Add service error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

router.post('/services/:id/toggle', async (req, res) => {
  try {
    const svc = await Service.findById(req.params.id);
    if (svc) {
      svc.active = !svc.active;
      await svc.save();
    }
    res.redirect('/admin/services');
  } catch (e) {
    console.error('Toggle error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

router.post('/services/:id/delete', async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.redirect('/admin/services');
  } catch (e) {
    console.error('Delete error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

module.exports = router;
