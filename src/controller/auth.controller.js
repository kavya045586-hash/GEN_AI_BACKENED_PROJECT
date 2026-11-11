const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const blacklistModel = require('../models/blacklist.model');

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

// If your frontend is hosted on a different site in production, use sameSite: 'none' (needs secure: true).
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '2d' });
}

async function registerUser(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const userAlreadyExists = await userModel.findOne({ email: String(email).toLowerCase() });
  if (userAlreadyExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({ name, email, password: hashedPassword });

  const token = signToken(user._id);
  res.cookie('token', token, { ...cookieOptions, maxAge: TWO_DAYS });

  return res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await userModel.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    return res.status(400).json({ message: 'User does not exist' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user._id);
  res.cookie('token', token, { ...cookieOptions, maxAge: TWO_DAYS });

  return res.status(200).json({
    message: 'User logged in successfully',
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
}

async function logOut(req, res) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  await blacklistModel.create({ token });
  res.clearCookie('token', cookieOptions);
  return res.status(200).json({ message: 'User logged out successfully' });
}

async function getMe(req, res) {
  const user = await userModel.findById(req.user.id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.status(200).json(user);
}

module.exports = { registerUser, loginUser, logOut, getMe };
