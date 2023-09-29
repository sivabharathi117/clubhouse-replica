const db = require('./../database/database');

function getConnectedUsers(roomId) {
    return new Promise((resolve, reject) => {
        if (roomId) {
            const connectedUser = "SELECT u.id,u.username, u.profile_pic, u.mobile_no, cu.socket, cu.socket_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.room_id = ? AND cu.is_online = 1";
            const connectedUserParam = [roomId];
            db.query(connectedUser, connectedUserParam, (err, connectedUserResponse) => {
                if (err) {
                    reject({ error: err, message: "Database issue" })
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
                    reject({ error: err, message: "Database issue" })
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
                    reject({ error: err, message: "Database issue" })
                } else {
                    const getUserDetail = "SELECT u.id, u.username, u.profile_pic, u.mobile_no, cu.socket_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.socket_id = ? ";
                    const getUserDetailParam = [socketID];
                    db.query(getUserDetail, getUserDetailParam, (err, userDetail) => {
                        if (err) {
                            reject({ error: err, message: "Database issue" })
                        } else if (userDetail.length) {
                            resolve(userDetail[0])
                        } else {
                            reject({ error: "User not found", message: "Unable to fetch user detail" })
                        }
                    })
                }
            });
        } else {
            reject({ error: "UserId is not present", message: "Unable to get User Details" })
        }
    })
}

module.exports = { getConnectedUsers, getUserDetail, disconnectUser };