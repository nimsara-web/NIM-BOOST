require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { connectDB, Service, Settings } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MongoDB Connect ============
connectDB();

// ============ View Engine ============
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============ Middleware ============
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============ Session (MongoDB store) ============
app.use(session({
  secret: process.env.SESSION_SECRET || 'nimora-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7, // 7 days
    autoRemove: 'native',
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: false,  // Render proxy use කරන නිසා false
    httpOnly: true,
  },
  proxy: true,
}));

// ============ Global vars for templates ============
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  try {
    const rows = await Settings.find().lean();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.locals.settings = settings;
  } catch (e) {
    res.locals.settings = {};
  }
  next();
});

// ============ Routes ============
app.use('/', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/admin', require('./routes/admin'));

// ============ Landing page ============
app.get('/', async (req, res) => {
  try {
    const services = await Service.find({ active: true }).lean();
    res.render('index', { services });
  } catch (e) {
    console.error('Landing page error:', e.message);
    res.render('index', { services: [] });
  }
});

// ============ 404 Handler ============
app.use((req, res) => {
  res.status(404).send('404 — Page not found');
});

// ============ Start Server ============
app.listen(PORT, () => console.log(`🚀 NIMORA BOOST running on port ${PORT}`));
