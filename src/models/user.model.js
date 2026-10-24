const mongoose=require('mongoose');  //importing the mongoose package to interact with MongoDB
const userSchema=new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});


const userModel = mongoose.model('User', userSchema);
module.exports = userModel;
