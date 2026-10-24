const express=require('express'); 
const cookieParser=require('cookie-parser');
//express is a web framework for Node.js that simplifies the process of building web applications 
// and APIs. It provides a set of features and utilities to handle routing, middleware, and HTTP requests and responses.

const app=express();
app.use(express.json());   //middleware to parse incoming JSON requests
app.use(cookieParser());  //middleware to parse cookies from incoming requests

app.use('/api/auth',require('./routes/auth.routes'));  //mounting the auth routes on the /api/auth path

module.exports=app;