require("dotenv").config();
const express = require("express");
const {connect} = require("./connection");
const router = require("./controller/api");
const apirouter = require("./controller/user");
const cookieparser = require("cookie-parser");
const faceRecognition = require("./faceRecognition");
const faceAttendanceRoutes = require("./routes/faceAttendance");

const app = express();

app.use(express.urlencoded({extended:false}));
app.use(express.json())
app.use(cookieparser());

//Database Connect - mysql locally connected hai
connect();

app.set("views","views");
app.set("view engine", "ejs");

// Initialize face recognition
faceRecognition.initialize().then(() => {
  console.log("✓ Face recognition initialized");
}).catch(err => {
  console.error("✗ Face recognition initialization failed:", err.message);
});

// /api route = controller/user.js 
app.use("/",router);
app.use("/api",apirouter);
app.use("/api",faceAttendanceRoutes);


app.listen(8000, () => {
  console.log("Server Started on http://localhost:8000");
});
