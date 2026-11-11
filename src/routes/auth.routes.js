const { Router } = require('express');
const { registerUser, loginUser, logOut, getMe } = require('../controller/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../middleware/asyncHandler');

const authRouter = Router();

authRouter.post('/register', asyncHandler(registerUser));
authRouter.post('/login', asyncHandler(loginUser));
authRouter.get('/logout', asyncHandler(logOut));
authRouter.get('/get-me', authenticate, asyncHandler(getMe));

module.exports = authRouter;
