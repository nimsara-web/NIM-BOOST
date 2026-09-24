const express = require('express');
const router = express.Router();
const { User, Service, Order, Transaction } = require('../database');

// ============ AUTH MIDDLEWARE ============
function auth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ============ USER DASHBOARD ============
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    const orders = await Order.find({ user: user._id })
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.render('dashboard', { user, orders });
  } catch (e) {
    console.error('Dashboard error:', e.message);
    console.error(e.stack);
    res.status(500).send('Dashboard error: ' + e.message);
  }
});

// ============ NEW ORDER PAGE ============
router.get('/new-order', auth, async (req, res) => {
  try {
    const services = await Service.find({ active: true }).lean();
    res.render('new-order', { services, error: null, success: null });
  } catch (e) {
    console.error('New order page error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

// ============ PLACE ORDER ============
router.post('/new-order', auth, async (req, res) => {
  const { service_id, link, quantity } = req.body;
  try {
    const services = await Service.find({ active: true }).lean();
    const svc = await Service.findById(service_id);
    const qty = parseInt(quantity);

    if (!svc) throw new Error('Invalid service');
    if (!link) throw new Error('Link required');
    if (qty < svc.min_qty || qty > svc.max_qty) {
      throw new Error(`Quantity must be between ${svc.min_qty} and ${svc.max_qty}`);
    }

    const cost = (svc.price_per_1000 / 1000) * qty;
    const user = await User.findById(req.session.user.id);

    if (!user) throw new Error('User not found');
    if (user.balance < cost) throw new Error('Insufficient balance. Contact admin to top-up.');

    user.balance -= cost;
    await user.save();

    await Order.create({
      user: user._id,
      service: svc._id,
      link,
      quantity: qty,
      cost,
    });

    await Transaction.create({
      user: user._id,
      amount: -cost,
      type: 'order',
      note: `Order: ${svc.name} x${qty}`,
    });

    res.render('new-order', {
      services,
      error: null,
      success: `✅ Order placed! Cost: $${cost.toFixed(4)}`,
    });
  } catch (e) {
    console.error('New order error:', e.message);
    const services = await Service.find({ active: true }).lean();
    res.render('new-order', { services, error: e.message, success: null });
  }
});

// ============ MY ORDERS ============
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.user.id })
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.render('orders', { orders });
  } catch (e) {
    console.error('Orders error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

module.exports = router;
