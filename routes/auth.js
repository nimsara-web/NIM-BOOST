const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');

router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/register', (req, res) => res.render('register', { error: null }));

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) throw new Error('All fields required');
    if (password.length < 6) throw new Error('Password must be 6+ chars');
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username,email,password) VALUES (?,?,?)").run(username, email, hash);
    res.redirect('/login?registered=1');
  } catch (e) {
    res.render('register', { error: e.message });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username=? OR email=?").get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect(user.role === 'admin' ? '/admin' : '/user');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
