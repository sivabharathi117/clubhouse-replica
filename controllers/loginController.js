const db = require('./../database/database');
const jwt = require('jsonwebtoken');
const fast2sms = require("fast-two-sms");

let otp = '';
const message = `This is your OTP to Login - ${otp}`;

async function login(req, res, next) {
  try {
    const mobileNo = req.body.mobile;
    const username = req.body.username || '';
    if (mobileNo) {
      const getUser = "SELECT * from users WHERE mobile_no = ?";
      const getUserParams = [mobileNo];
      otp = Math.floor(1000 + Math.random() * 9000);
      db.query(getUser, getUserParams, async (err, user) => {
        if (err) {
          res.send("SQL error")
        } else if (user.length) {
          const updateOtp = "UPDATE users SET otp = ? WHERE id = ?";
          const updateOtpParams = [otp, user[0].id];
          db.query(updateOtp, updateOtpParams, async (error, successData) => {
            if (error) {
              res.send("SQL error")
            } else {
              const response = await fast2sms.sendMessage({
                authorization: process.env.FAST2SMS,
                message,
                numbers: [mobileNo],
              });
              const responseData = {
                status: "success",
                code: 200,
                message: "otp send successfully"
              }
              res.send(responseData);
            }
          })
        } else {
          const updateOtp = "INSERT INTO users (username, mobile_no, otp) Values (?,?,?)";
          const updateOtpParams = [username, mobileNo, otp];
          db.query(updateOtp, updateOtpParams, async (error, successData) => {
            if (error) {
              res.send("SQL error");
            } else {
              const response = await fast2sms.sendMessage({
                authorization: process.env.FAST2SMS,
                message,
                numbers: [mobileNo],
              });
              const responseData = {
                status: "success",
                code: 200,
                message: "otp send successfully"
              }
              res.send(responseData);
            }
          });
        }
      })
    } else {
      res.send("invalid input");
    }
  } catch (err) {
    res.send("error");
  }
}

// function signUp(req, res, next) {
//   try {
//     const userName = req.body.name;
//     const mobileNo = req.body.mobile;
//     const password = req.body.password;
//     if (mobileNo && userName && password) {
//       const SQL = "SELECT * from users WHERE mobile_no = ? AND password = ?";
//       const params = [mobileNo, password];
//       db.query(SQL, params, (err, res) => {
//         if (err) {
//           res.send("error")
//         } else if (!res.length) {
//           const addUserSQL = "INSERT INTO users Values(?,?,?)"
//           const addUserParams = [userName, mobileNo, password];
//           db.query(addUserSQL, addUserParams, (error, response) => {
//             if (error) {
//               res.send("error")
//             } else {
//               res.send("success")
//             }
//           })
//         } else {
//           res.send("user exist")
//         }
//       })
//     } else {
//       res.send("error")
//     }
//   } catch (err) {
//     res.send("error")
//   }
// }

function verifyOtp(req, res, next) {
  try {
    const mobileNo = req.body.mobile;
    const userOtp = req.body.otp;
    if (mobileNo && userOtp) {
      const verifyOtp = "SELECT * from users WHERE mobile_no = ?";
      const verifyOtpParams = [mobileNo];
      db.query(verifyOtp, verifyOtpParams, (err, user) => {
        if (err) {
          res.send("SQL error")
        } else if (user.length) {
          if (user[0].otp === userOtp) {
            const updateOtp = "UPDATE users SET otp = ? WHERE id = ?";
            const updateOtpParams = ['', user[0].id];
            db.query(updateOtp, updateOtpParams, async (error, successData) => {
              if (error) {
                res.send("SQL error")
              } else {
                const tokenData = jwt.sign(
                  {
                    data: {
                      id: user[0].id,
                      mobileNo: user[0].username
                    },
                  },
                  process.env.jwtSecretKey
                );
                const responseData = {
                  status: "success",
                  code: 200,
                  token: tokenData
                }
                res.status(200).json(responseData);
              }
            })
          } else {
            const responseData = {
              status: "success",
              code: 200,
              message: "Otp not matched"
            }
            res.send(responseData);
          }
        } else {
          res.send("error")
        }
      })
    } else {
      res.send("invalid input");
    }
  } catch (e) {
    res.send("error");
  }
}

module.exports = { login, verifyOtp };
