const express = require("express");
const apirouter = express.Router();

apirouter.post("/location",(req,res)=>{
   console.log(req.body);
})

module.exports = apirouter;
