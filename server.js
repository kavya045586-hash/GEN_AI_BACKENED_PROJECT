require('dotenv').config();  //importing the dotenv package to load environment variables from a .env file

const app=require('./src/app.js');  //importing the express app from src/app.js
const connectDB=require('./src/config/database.js');  //importing the connectDB function from src/config/database.js

connectDB();  //calling the connectDB function to establish a connection to the MongoDB database
app.listen(process.env.PORT || 3000,()=>{
    console.log('Server is running on port ' + (process.env.PORT || 3000));
});

