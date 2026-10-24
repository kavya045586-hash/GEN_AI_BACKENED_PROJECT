const { Router } = require('express');
const { registerUser,loginUser,logOut } = require('../controller/auth.controller');
const authRouter = Router();
const cookieParser = require('cookie-parser');


authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.get('/logout', logOut);

module.exports = authRouter;