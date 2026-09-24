const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../database');

// ============ LOGIN PAGE ============
router.get('/login', (req, res) => {
  res.render('login', {
    error: null,
    registered: req.query.registered || null,
  });
});

// ============ REGISTER PAGE ============
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// ============ REGISTER POST ============
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) throw new Error('All fields required');
    if (password.length < 6) throw new Error('Password must be 6+ chars');

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) throw new Error('Username or email already taken');

    const hash = bcrypt.hashSync(password, 10);
    await User.create({ username, email, password: hash });

    res.redirect('/login?registered=1');
  } catch (e) {
    console.error('Register error:', e.message);
    res.render('register', { error: e.message });
  }
});

// ============ LOGIN POST ============
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', {
        error: 'Invalid credentials',
        registered: null,
      });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    res.redirect(user.role === 'admin' ? '/admin' : '/user');
  } catch (e) {
    console.error('Login error:', e.message);
    res.render('login', { error: 'Server error: ' + e.message, registered: null });
  }
});

// ============ LOGOUT ============
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
