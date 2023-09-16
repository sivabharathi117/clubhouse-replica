const db = require('./../database/database');
const jwt = require('jsonwebtoken');
const fast2sms = require("fast-two-sms");

let otp = '';
const message = `This is your OTP to Login - ${otp}. Otp will expire in 2 mins`;

async function login(req, res, next) {
  try {
    const mobileNo = req.body.mobileNo;
    const username = req.body.username || '';
    if (mobileNo) {
      const getUser = "SELECT id from users WHERE mobile_no = ?";
      const getUserParams = [mobileNo];
      otp = Math.floor(1000 + Math.random() * 9000);
      db.query(getUser, getUserParams, async (err, user) => {
        if (err) {
          const errorData = {
            status: "failure",
            code: 500,
            error: err
          }
          res.status(500).send(errorData);
        } else if (user.length) {
          const updateOtp = "UPDATE users SET otp = ?, otp_created_time = ? WHERE id = ?";
          const updateOtpParams = [otp, new Date(), user[0].id];
          db.query(updateOtp, updateOtpParams, async (error, successData) => {
            if (error) {
              const errorData = {
                status: "failure",
                code: 500,
                error
              }
              res.status(500).send(errorData);
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
              console.log("otp" + otp);
            }
          })
        } else {
          const updateOtp = "INSERT INTO users (username, mobile_no, otp, otp_created_time) Values (?,?,?,?)";
          const updateOtpParams = [username, mobileNo, otp, new Date()];
          db.query(updateOtp, updateOtpParams, async (error, successData) => {
            if (error) {
              const errorData = {
                status: "failure",
                code: 500,
                error
              }
              res.status(500).send(errorData);
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
              console.log("otp" + otp);
              res.send(responseData);
            }
          });
        }
      })
    } else {
      const errorData = {
        status: "failure",
        code: 400,
        error: "invalid input"
      }
      res.status(400).send(errorData);
    }
  } catch (err) {
    const errorData = {
      status: "failure",
      code: 400,
      error: err
    }
    res.status(400).send(errorData);
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
    const mobileNo = req.body.mobileNo;
    const userOtp = req.body.otp;
    if (mobileNo && userOtp) {
      const verifyOtp = "SELECT * from users WHERE mobile_no = ?";
      const verifyOtpParams = [mobileNo];
      db.query(verifyOtp, verifyOtpParams, (err, user) => {
        if (err) {
          const errorData = {
            status: "failure",
            code: 500,
            error: err
          }
          res.status(500).send(errorData);
        } else if (user.length) {
          if (user[0].otp === userOtp) {
            const otpExpireTime = new Date().getTime() - user[0].otp_created_time.getTime();
            //otp expires after 2mins
            if (otpExpireTime && otpExpireTime < 120000) {
              const updateOtp = "UPDATE users SET otp = ?, otp_created_time = ? WHERE id = ?";
              const updateOtpParams = [null, null, user[0].id];
              db.query(updateOtp, updateOtpParams, async (error, successData) => {
                if (error) {
                  const errorData = {
                    status: "failure",
                    code: 500,
                    error
                  }
                  res.status(500).send(errorData);
                } else {
                  const tokenData = jwt.sign(
                    {
                      data: {
                        id: user[0].id,
                        username: user[0].username,
                        mobileNo: user[0].mobile_no
                      },
                    },
                    process.env.jwtSecretKey
                  );
                  const responseData = {
                    status: "success",
                    code: 200,
                    data: {
                      token: tokenData,
                      userId: user[0].id,
                      username: user[0].username,
                      mobileNo: user[0].mobile_no,
                      profilePicture: user[0].profile_pic
                    }
                  }
                  res.status(200).json(responseData);
                }
              })
            } else {
              const errorData = {
                status: "failure",
                code: 400,
                error: "Otp expired"
              }
              res.status(400).send(errorData);
            }

          } else {
            const responseData = {
              status: "failure",
              code: 400,
              error: "Invalid Otp"
            }
            res.status(400).send(responseData);
          }
        } else {
          const errorData = {
            status: "failure",
            code: 404,
            message: "User not found"
          }
          res.status(404).send(errorData);
        }
      })
    } else {
      const errorData = {
        status: "failure",
        code: 400,
        error: "invalid input"
      }
      res.status(400).send(errorData);
    }
  } catch (err) {
    const errorData = {
      status: "failure",
      code: 400,
      error: err
    }
    res.status(400).send(errorData);
  }
}

module.exports = { login, verifyOtp };
