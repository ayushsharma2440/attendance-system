const express = require("express");
const { verifytoken } = require("../controller/auth");

function verifyauth(req,res,next){
const token = req.cookies.jwt;
if (!token){
    return res.redirect("/login");
}
try {
    const user = verifytoken(token)
    if (user){
        next();
    }
} catch (error) {
    res.clearCookie("jwt");
    return res.redirect("/login");
}
}

function vertiyadmin(req,res,next){
const token = req.cookies.jwt;
if (!token){
    return res.redirect("/login");
}
try {
    const user = verifytoken(token)
    if (user){
        next();
    }
} catch (error) {
    res.clearCookie("jwt");
    return res.redirect("/login");
}
}

module.exports = verifyauth