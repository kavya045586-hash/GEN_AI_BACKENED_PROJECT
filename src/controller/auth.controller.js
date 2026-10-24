const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

async function registerUser(req, res) {
    const userAlreadyExists = await userModel.findOne({ email: req.body.email });
    if(userAlreadyExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    else 
        {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        req.body.password = hashedPassword;

        const { name, email, password } = req.body;
        const user = await userModel.create({ name, email, password });
        res.status(201).json(user);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
        res.json({ token });
        res.cookie('token', token, { httpOnly: true, maxAge: 2 * 24 * 60 * 60 * 1000 }); // 2 days
        res.status(200).json({ message: 'User registered successfully', token });
    }
}


async function loginUser(req, res) {
    const user = await userModel.findOne({ email: req.body.email });

    if(!user) 
    {
        return res.status(400).json({ message: 'User does not exist' });
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if(!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 2 * 24 * 60 * 60 * 1000 }); // 2 days
    res.status(200).json({ message: 'User logged in successfully', token });

}

//TOKEN BLACKLISTING AND LOGOUT FUNCTION
async function logOut(req, res)
{
    const token= req.cookies.token;
    if(!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    else
    {
        // Add token to blacklist
        const blacklistModel = require('../models/blacklist.model');
        const blacklistedToken = new blacklistModel({ token });
        blacklistedToken.save();
        res.clearCookie('token');
        res.status(200).json({ message: 'User logged out successfully' });
    }
}
module.exports = { registerUser, loginUser, logOut };