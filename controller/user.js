const express = require("express");
const apirouter = express.Router();

apirouter.post("/location", (req, res) => {
   console.log("Attendance Data Received:", req.body);
   
   const { lat, lon, name, confidence, timestamp } = req.body;

   res.json({
      success: true,
      message: "Attendance marked successfully",
      data: {
         name: name,
         location: { lat, lon },
         confidence: confidence,
         timestamp: timestamp
      }
   });
});

module.exports = apirouter;
