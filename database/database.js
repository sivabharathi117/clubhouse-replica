var mysql = require("mysql");

var server = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Kanyakumari@31",
  database: "mysql",
});

server.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = server;
