const express = require("express");
const { getconnection } = require("../connection");
const { signin } = require("./auth");
const verifyauth = require("../middleware/middleware");

const router = express.Router();

router.get("/",(req,res)=>{
    res.send("Homepage");
})

router.get("/markattendance",verifyauth,(req,res)=>{
    res.render("home");
})

router.get("/myattendance",verifyauth,(req,res)=>{
    res.render("myattendance");
})

router.get("/face",(req,res)=>{
    res.render("face-attendance-example");
})

// Temporary route to clear cookies - remove this after testing
router.get("/clear-cookies",(req,res)=>{
    res.clearCookie("jwt");
    res.send("Cookies cleared! Please <a href='/login'>login again</a>");
})

// Debug endpoint to check cookies
router.get("/debug-cookies",(req,res)=>{
    res.json({
        cookies: req.cookies,
        hasCookieParser: !!req.cookies,
        jwtCookie: req.cookies?.jwt || 'not found'
    });
})

// Test page
router.get("/test-auth",(req,res)=>{
    res.sendFile(require('path').join(__dirname, '../test-auth.html'));
})

// Quick test user creation (REMOVE IN PRODUCTION)
router.get("/create-test-user",(req,res)=>{
    const sql = getconnection();
    sql.query("SELECT * FROM USER WHERE email='test@example.com'", (err, result) => {
        if (err) return res.status(500).send("Database error: " + err.message);
        
        if (result.length > 0) {
            return res.send("Test user already exists. Email: test@example.com, Password: password");
        }
        
        sql.query("INSERT INTO USER (name, email, password, role) VALUES (?, ?, ?, ?)", 
            ['Test User', 'test@example.com', 'password', 'user'], 
            (err) => {
                if (err) return res.status(500).send("Error creating user: " + err.message);
                res.send("Test user created! Email: test@example.com, Password: password<br><a href='/login'>Go to login</a>");
            }
        );
    });
})

router.get("/admin",verifyauth,(req,res)=>{
    res.render("admin");
})



router.get("/login",(req,res)=>{
    res.render("login");
})

router.post("/login",(req,res)=>{
    const sql = getconnection();
    const {email,password}  = req.body;
    sql.query(`Select * from USER where email="${email}" AND password="${password}"`,(err,result)=>{
        if (err) throw err;
        if (result.length === 0){
            res.send("NO USER exists");
        }
        else
        {
            user = result[0];
            const token = signin(user.id,email);
            console.log('Generated token:', token.substring(0, 20) + '...');
            
            // Set cookie with proper options
            res.cookie("jwt", token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: 'lax'
            });
            
            console.log('Cookie set for user:', user.email);
            
            if (user.role=='admin'){
                return res.redirect("/admin");
            }
           return res.redirect("/myattendance");
        }
    })
})

router.get("/signup",(req,res)=>{
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