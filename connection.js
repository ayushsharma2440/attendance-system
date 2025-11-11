const mysql = require("mysql2");
const { createtable } = require("./model/models");
let sql;


function connect(){

// First connect without database to create it
sql = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "ayush"
});

sql.connect((err)=>{
if (err){
  console.log("The error is :",err)
}
else{
  console.log("Database Connected");
  
  // Create database if it doesn't exist
  sql.query("CREATE DATABASE IF NOT EXISTS attendance_db",(err,result)=>{
    if (err) {
      console.error("Error creating database:", err);
      return;
    }
    
    console.log("Database 'attendance_db' ready");
    
    // Now switch to use the database
    sql.changeUser({database: 'attendance_db'}, (err) => {
      if (err) {
        console.error("Error switching to database:", err);
        return;
      }
      
      console.log("Using database: attendance_db");
      createtable(sql);
    });
  });
}
})

}

function getconnection(){
  return sql;
}


module.exports = {connect,getconnection};


