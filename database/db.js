const mysql = require("mysql");

const connection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "clubhouse",
  port: 3306
});

const queryRunner = async (query, params) => {
  try {
    connection.query(query, params, (err, data) => {
      if (err) {
        return (err);
      } else {
        return (data);
      }
    })
  } catch (err) {
    return (err)
  }
}
module.exports = {
    queryRunner: queryRunner
}
