const mysql = require("mysql");

const connection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "clubhouse",
    port: 3306,
    connectionLimit: 10,
    connectTimeout: 30000,
  });

  const queryRunner = (query, params) => {
    return new Promise((resolve, reject) => {
      connection.query(query, params, (dbError, dbResponse) => {
        if (dbError) {
          reject({ isError: true, error: dbError });
        } else {
          resolve({ isError: false, data: dbResponse });
        }
      });
    });
  };
  
module.exports = {
    queryRunner: queryRunner
}
