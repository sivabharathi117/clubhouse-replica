const server = require('./../database/database');
const jwt = require('jsonwebtoken');

function login(req, res, next) {
try{
    const mobileNo = req.body.mobile;    
    const password = req.body.password;
    if(mobileNo && password) {
        const SQL = "SELECT * from users WHERE mobile_no = ? AND password = ?";
        const params = [mobileNo,password];
        server.query(SQL, params, async (err, res) => {
          if(err){
            res.send("error")
          } else if (res.length) {
            const tokenData = jwt.sign(
                {
                  data: {
                    id: res[0].id,
                    mobileNo: res[0].user_Name,
                    password: res[0].password, //config.webVersionForUpdate
                  },
                },
                process.env.jwtSecretKey
              );
              res.status(200).json({mobileNo: res.mobileNo, token: tokenData});
          } else {
            res.send("no user found");
          }
        })
    } else {
        res.send("error");
    }
} catch(err){
    res.send("error");
}
}

function signUp(req, res, next) {
    try{
      const userName = req.body.name;
      const mobileNo = req.body.mobile;    
        const password = req.body.password;
      if(mobileNo && userName && password) {
        const SQL = "SELECT * from users WHERE mobile_no = ? AND password = ?";
        const params = [mobileNo,password];
        server.query(SQL,params, (err, res)=>{
            if(err){
               res.send("error")
            } else if (!res.length) {
              const addUserSQL = "INSERT INTO users Values(?,?,?)"
              const addUserParams = [userName,mobileNo,password];
              server.query(addUserSQL,addUserParams, (error, response)=>{
                if(error){
                   res.send("error")
                } else {
                   res.send("success")
                }
              })
            } else {
                res.send("user exist")
            }
        })
      } else {
        res.send("error")
      }
    } catch (err){
res.send("error")
    }
}

module.exports = { login, signUp };
