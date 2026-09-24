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
  let services = [];

  try {
    // Services load කරන්න (error එකක් ආවත් form එකේ පෙන්නන්න)
    services = await Service.find({ active: true }).lean();

    // ============ VALIDATION ============
    
    // 1. Service select කරලා තියෙනවද?
    if (!service_id || service_id.trim() === '') {
      throw new Error('Please select a service');
    }

    // 2. Valid MongoDB ObjectId ද? (24 hex chars)
    if (!service_id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid service selected');
    }

    // 3. Service DB එකේ තියෙනවද?
    const svc = await Service.findById(service_id);
    if (!svc) throw new Error('Service not found');
    if (!svc.active) throw new Error('This service is currently disabled');

    // 4. Link එක තියෙනවද?
    if (!link || link.trim() === '') {
      throw new Error('Please enter a link');
    }

    // 5. Quantity එක valid ද?
    const qty = parseInt(quantity);
    if (!qty || isNaN(qty) || qty <= 0) {
      throw new Error('Please enter a valid quantity');
    }

    // 6. Quantity min/max ඇතුලේ ද?
    if (qty < svc.min_qty || qty > svc.max_qty) {
      throw new Error(`Quantity must be between ${svc.min_qty} and ${svc.max_qty}`);
    }

    // ============ COST CALCULATION ============
    const cost = (svc.price_per_1000 / 1000) * qty;
    const user = await User.findById(req.session.user.id);

    if (!user) throw new Error('User not found');

    // 7. Balance එක ඇති ද?
    if (user.balance < cost) {
      throw new Error(
        `Insufficient balance. Required: $${cost.toFixed(4)}, Available: $${user.balance.toFixed(4)}. Contact admin to top-up.`
      );
    }

    // ============ DEDUCT BALANCE ============
    user.balance -= cost;
    await user.save();

    // ============ CREATE ORDER ============
    await Order.create({
      user: user._id,
      service: svc._id,
      link: link.trim(),
      quantity: qty,
      cost,
    });

    // ============ LOG TRANSACTION ============
    await Transaction.create({
      user: user._id,
      amount: -cost,
      type: 'order',
      note: `Order: ${svc.name} x${qty}`,
    });

    // ============ SUCCESS ============
    res.render('new-order', {
      services,
      error: null,
      success: `✅ Order placed successfully! Service: ${svc.name} | Qty: ${qty} | Cost: $${cost.toFixed(4)}`,
    });

  } catch (e) {
    console.error('New order error:', e.message);
    res.render('new-order', {
      services,
      error: e.message,
      success: null,
    });
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
