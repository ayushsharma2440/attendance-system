
const createtable = (sql)=>{

  sql.query("use attendance;",(err,result)=>{
    if (err) throw err;
  })


  sql.query(`
    CREATE TABLE IF NOT EXISTS USER (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(100),
      password VARCHAR(50),
      has_attended BOOLEAN DEFAULT FALSE,
      role ENUM('admin', 'teacher', 'student') DEFAULT 'student'
    )
  `, (err) => {
    if (err) throw err;
    console.log("Table USER created");
  });

  sql.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      attendance_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      date DATE NOT NULL,
      at_time TIME,
      FOREIGN KEY (user_id) REFERENCES USER(id)
    )
  `, (err) => {
    if (err) throw err;
    console.log("Table attendance created");
  });

  sql.query(`
    CREATE TABLE IF NOT EXISTS locations (
      location_id INT AUTO_INCREMENT PRIMARY KEY,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      at_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      attendance_id INT,
      FOREIGN KEY (attendance_id) REFERENCES attendance(attendance_id)
    )
  `, (err) => {
    if (err) throw err;
    console.log("Table locations created");
  });

};


module.exports = {createtable};