const mysql = require("mysql");

const server = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ss#123",
  database: "clubhouse",
  port: 3306
});

server.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = server;
