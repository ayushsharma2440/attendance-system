
const createtable = (sql)=>{

    sql.query("use attendance",(err,result)=>{});

    sql.query("CREATE TABLE IF NOT EXISTS USER (id int AUTO_INCREMENT PRIMARY KEY,name varchar(50) NOT NULL,email varchar(100),password varchar(50),has_attended BOOLEAN DEFAULT FALSE)",(err,result)=>{
        if (err) throw err;
        else console.log("Table USER created");
    });
    sql.query("CREATE TABLE IF NOT EXISTS attendance ( attendance_id INT AUTO_INCREMENT PRIMARY KEY,user_id INT ,date DATE NOT NULL, at_time TIME,location_id INT,FOREIGN KEY (user_id) REFERENCES USER(id),FOREIGN KEY (location_id) REFERENCES location(location_id))",(err,result)=>{
        if (err) throw err;
        else console.log("Table Location created");
    });
    sql.query("CREATE TABLE IF NOT EXISTS locations ( location_id INT AUTO_INCREMENT PRIMARY KEY,latitude DECIMAL(10, 7),longitude DECIMAL(10, 7),at_time DATETIME DEFAULT CURRENT_TIMESTAMP, attendance_id INT,FOREIGN KEY (attendance_id) REFERENCES attendance(attendance_id)",(err,result)=>{
        if (err) throw err;
        else console.log("Table Location created");
    });

}

module.exports = {createtable};