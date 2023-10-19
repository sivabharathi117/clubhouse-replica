const db = require('./../database/database');
const commonUtils = require('./../utils/commonUtils');

function getConnectedUsers(roomId) {
    return new Promise((resolve, reject) => {
        if (roomId) {
            const connectedUser = "SELECT u.id,u.username, u.profile_pic, u.mobile_no, cu.socket, cu.socket_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.room_id = ? AND cu.is_online = 1";
            const connectedUserParam = [roomId];
            db.query(connectedUser, connectedUserParam, (err, connectedUserResponse) => {
                if (err) {
                    reject({ error: err, message: "Database issue when getting online users" })
                } else {
                    connectedUserResponse = connectedUserResponse.map((res) => {
                        res.socket = JSON.parse(res.socket)
                        return res;
                    })
                    resolve(connectedUserResponse)
                }
            });
        } else {
            reject({ error: "RoomId is not present", message: "Unable to connect" })
        }
    });
}

function getUserDetail(userId) {
    return new Promise((resolve, reject) => {
        if (userId) {
            const getUser = "SELECT id, username, profile_pic, mobile_no FROM users WHERE id = ?";
            const getUserParam = [userId];
            db.query(getUser, getUserParam, (err, getUserResponse) => {
                if (err) {
                    reject({ error: err, message: "Database issue when getting user detail" })
                } else if (getUserResponse.length) {
                    resolve(getUserResponse[0])
                } else {
                    reject({ error: "User not found", message: "Unable to fetch user detail" })
                }
            });
        } else {
            reject({ error: "UserId is not present", message: "Unable to get User Details" })
        }
    });
};

function disconnectUser(socketID) {
    return new Promise((resolve, reject) => {
        if (socketID) {
            const disconnectUser = "UPDATE connected_users SET is_online = 0 WHERE socket_id = ?";
            const disconnectUserParam = [socketID];
            db.query(disconnectUser, disconnectUserParam, (err, response) => {
                if (err) {
                    reject({ error: err, message: "Database issue when disconnecting" })
                } else {
                    const getUserDetail = "SELECT u.id, u.username, u.profile_pic, u.mobile_no, cu.socket_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.socket_id = ? ";
                    const getUserDetailParam = [socketID];
                    db.query(getUserDetail, getUserDetailParam, (err, userDetail) => {
                        if (err) {
                            reject({ error: err, message: "Database issue when getting disconnected user detail" })
                        } else if (userDetail.length) {
                            resolve(userDetail[0])
                        } else {
                            reject({ error: "User not found", message: "Unable to fetch user detail" })
                        }
                    })
                }
            });
        } else {
            reject({ error: "socketID is not present", message: "Unable to disconnect user" })
        }
    })
}

function editUser(req, res, next) {
    try {
        const userId = req.params.id;
        const checkUser = "SELECT id, username, mobile_no, profile_pic FROM users WHERE id = ?";
        const checkUserParams = [userId];
        db.query(checkUser, checkUserParams, (error, user) => {
            if (error) {
                commonUtils.handleErrorResponse(res, 500, error)
            } else if (user.length) {
                const username = req.body.username || user[0].username;
                const mobileNo = req.body.mobileNo || user[0].mobile_no;
                const profileImage = req.body.profileImage || user[0].profile_pic;
                const updateUser = "UPDATE users SET username = ?, mobile_no = ?, profile_pic = ? WHERE id = ?";
                const updateUserParams = [username, mobileNo, profileImage, userId];
                db.query(updateUser, updateUserParams, (err, response) => {
                    if (err) {
                        commonUtils.handleErrorResponse(res, 500, err)
                    } else {
                        commonUtils.handleSuccessResponse(res, 200, {}, "User updated successfully");
                    }
                })
            } else {
                commonUtils.handleErrorResponse(res, 404, "User not found")
            }
        })
    }
    catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function getUser(req, res, next) {
    try {
        const userId = req.params.id;
        const getUserSql = "SELECT id, username, mobile_no, profile_pic FROM users WHERE id = ?";
        const getUserParams = [userId];
        db.query(getUserSql, getUserParams, (error, user) => {
            if (error) {
                commonUtils.handleErrorResponse(res, 500, error)
            } else if (user.length) {
                const data = {
                    id: user[0].id,
                    username: user[0].username,
                    mobileNo: user[0].mobile_no,
                    profileImage: user[0].profile_pic
                }
                commonUtils.handleSuccessResponse(res, 200, data);
            } else {
                commonUtils.handleErrorResponse(res, 404, "User not found")
            }
        })
    }
    catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

module.exports = { getConnectedUsers, getUserDetail, disconnectUser, editUser, getUser };