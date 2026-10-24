const mongoose=require('mongoose');  //importing the mongoose package to interact with MongoDB  
require('dotenv').config(); 

async function connectDB(){
    await mongoose.connect(process.env.MONGODB_URI)  //connecting to the MongoDB database using the connection string from the environment variable
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });
}

module.exports=connectDB;  //exporting the connectDB function to be used in other parts of the application