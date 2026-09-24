require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'nimora-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// Global vars for templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  const settings = {};
  db.prepare("SELECT * FROM settings").all().forEach(r => settings[r.key] = r.value);
  res.locals.settings = settings;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/admin', require('./routes/admin'));

// Landing page
app.get('/', (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE active=1").all();
  res.render('index', { services });
});

app.listen(PORT, () => console.log(`🚀 NIMORA BOOST running on port ${PORT}`));
