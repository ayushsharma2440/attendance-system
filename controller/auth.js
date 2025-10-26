const jwt = require("jsonwebtoken");

function signin(id,email){
const token = jwt.sign({
    _id:id,
    email:email
},"ayush")
return token;
}

function verifytoken(token){
const result = jwt.verify(token,"ayush");
return result;
}
module.exports = {signin,verifytoken}