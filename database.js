const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============ CONNECT ============
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
    await seedData();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ============ SCHEMAS ============

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
  category: { type: String, required: true },
  name: { type: String, required: true },
  price_per_1000: { type: Number, required: true },
  min_qty: { type: Number, default: 100 },
  max_qty: { type: Number, default: 100000 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  link: { type: String, required: true },
  quantity: { type: Number, required: true },
  cost: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['order', 'admin', 'refund'], required: true },
  note: { type: String },
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String },
});

// ============ MODELS ============
const User = mongoose.model('User', userSchema);
const Service = mongoose.model('Service', serviceSchema);
const Order = mongoose.model('Order', orderSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// ============ SEED ============
async function seedData() {
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const hash = bcrypt.hashSync('nimora123', 10);
    await User.create({
      username: 'nimora',
      email: 'admin@nimora.com',
      password: hash,
      role: 'admin',
    });
    console.log('✅ Admin created → nimora / nimora123');
  }

  const svcCount = await Service.countDocuments();
  if (svcCount === 0) {
    await Service.insertMany([
      { category: 'TikTok', name: 'TikTok Views', price_per_1000: 5, min_qty: 100, max_qty: 1000000 },
      { category: 'TikTok', name: 'TikTok Likes', price_per_1000: 15, min_qty: 50, max_qty: 50000 },
      { category: 'TikTok', name: 'TikTok Followers', price_per_1000: 80, min_qty: 100, max_qty: 20000 },
      { category: 'TikTok', name: 'TikTok Comments', price_per_1000: 200, min_qty: 10, max_qty: 5000 },
      { category: 'WhatsApp', name: 'WhatsApp Channel Followers', price_per_1000: 120, min_qty: 100, max_qty: 10000 },
      { category: 'WhatsApp', name: 'WhatsApp Channel Reactions', price_per_1000: 60, min_qty: 50, max_qty: 20000 },
      { category: 'Instagram', name: 'Instagram Followers', price_per_1000: 90, min_qty: 100, max_qty: 20000 },
      { category: 'Instagram', name: 'Instagram Likes', price_per_1000: 20, min_qty: 50, max_qty: 50000 },
      { category: 'YouTube', name: 'YouTube Views', price_per_1000: 150, min_qty: 500, max_qty: 100000 },
      { category: 'YouTube', name: 'YouTube Subscribers', price_per_1000: 400, min_qty: 50, max_qty: 10000 },
    ]);
    console.log('✅ Default services added');
  }

  const defaults = [
    { key: 'site_name', value: 'NIMORA BOOST' },
    { key: 'contact_whatsapp', value: '0784280074' },
    { key: 'usd_rate', value: '300' },
  ];
  for (const s of defaults) {
    await Settings.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }
}

module.exports = {
  connectDB,
  User,
  Service,
  Order,
  Transaction,
  Settings,
};
