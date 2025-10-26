const mysql = require("mysql2");
const { createtable } = require("./model/models");
let sql;
function connect(){

sql = mysql.createConnection({
  host:"127.0.0.1",
  user:"root",
  password:"ayush"
});

sql.connect((err)=>{
if (err){
  console.log("The error is :",err)
}
else{
  console.log("Database Connected");
  sql.query("CREATE DATABASE IF NOT EXISTS attendance",(err,result)=>{
    if (err) throw err;
    else{
      console.log("Database created");
    }
  })

  createtable(sql);

}
})

}

function getconnection(){
  return sql;
}


module.exports = {connect,getconnection};


