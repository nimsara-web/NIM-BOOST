require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { connectDB, Service, Settings } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ ENV CHECK ============
console.log('🔍 MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('🔍 SESSION_SECRET present:', !!process.env.SESSION_SECRET);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set!');
  process.exit(1);
}

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
  secret: process.env.SESSION_SECRET || 'nimora-fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'nimora_sessions',   // ← 'sessions' නෙවෙයි, clash නොවෙන්න
    ttl: 60 * 60 * 24 * 7,
    autoRemove: 'native',
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: false,
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
    console.error('Settings load error:', e.message);
    res.locals.settings = {};
  }
  next();
});

// ============ Landing page (මුලින්ම!) ============
app.get('/', async (req, res) => {
  try {
    const services = await Service.find({ active: true }).lean();
    res.render('index', { services });
  } catch (e) {
    console.error('❌ Landing page error:', e.message);
    console.error(e.stack);
    res.render('index', { services: [] });
  }
});

// ============ Routes ============
app.use('/', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/admin', require('./routes/admin'));

// ============ 404 Handler ============
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 — Page Not Found</h1>
    <p>Path: <code>${req.path}</code></p>
    <a href="/">Go Home</a>
  `);
});

// ============ GLOBAL ERROR HANDLER (Debug සඳහා) ============
app.use((err, req, res, next) => {
  console.error('❌❌❌ SERVER ERROR ❌❌❌');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);

  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error — NIMORA BOOST</title>
      <style>
        body { font-family: monospace; background: #0a0a0a; color: #eee; padding: 30px; }
        h1 { color: #ec4899; }
        .box { background: #111; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #8b5cf6; }
        .label { color: #06b6d4; font-weight: bold; }
        pre { background: #000; padding: 15px; border-radius: 8px; overflow: auto; color: #0f0; font-size: 12px; }
        a { color: #06b6d4; }
      </style>
    </head>
    <body>
      <h1>❌ Internal Server Error</h1>
      <div class="box">
        <p><span class="label">Path:</span> ${req.path}</p>
        <p><span class="label">Method:</span> ${req.method}</p>
        <p><span class="label">Message:</span> ${err.message}</p>
      </div>
      <div class="box">
        <p class="label">Stack Trace:</p>
        <pre>${err.stack}</pre>
      </div>
      <a href="/">← Go Home</a>
    </body>
    </html>
  `);
});

// ============ Start Server ============
app.listen(PORT, () => console.log(`🚀 NIMORA BOOST running on port ${PORT}`));
