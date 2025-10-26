const express = require("express");
const { getconnection } = require("../connection");

const router = express.Router();

router.get("/",(req,res)=>{
    res.render("home");
})

router.get("/face",(req,res)=>{
    res.render("face-attendance-example");
})


router.get("/login",(req,res)=>{
    res.render("login");
})

router.post("/login",(req,res)=>{
    console.log(req.body);
    return res.send("LOGGED IN");
})

router.get("/signup",(req,res)=>{
    console.log(req.body);
    res.render("signup");
})

router.post("/signup", (req, res) => {
    const sql = getconnection();
    const { name, email, password } = req.body;

    sql.query("SELECT COUNT(*) AS COUNT FROM User", (err, countResult) => {
        if (err) return res.status(500).send("Database error");

        const idcount = countResult[0].COUNT;

        sql.query("SELECT * FROM User WHERE email = ?", [email], (err, userResult) => {
            if (err) return res.status(500).send("Database error");

            if (userResult.length === 0) {
                sql.query(
                    "INSERT INTO User (id, name, email, password) VALUES (?, ?, ?, ?)",
                    [idcount + 1, name, email, password],
                    (err) => {
                        if (err) return res.status(500).send("Error inserting user");
                        return res.send("User created successfully");
                    }
                );
            } else {
                return res.send("User Already Exists");
            }
        });
    });
});
module.exports = router;