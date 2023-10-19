const db = require('./../database/database');
const commonUtils = require('./../utils/commonUtils');

function joinRoom(userId, roomId, socket) {
    return new Promise((resolve, reject) => {
        if (userId && socket && roomId) {
            const socketId = socket.id;
            const getConnectedUser = "SELECT id FROM connected_users WHERE room_id = ? AND user_id = ?";
            const getConnectedUserParam = [roomId, userId];
            db.query(getConnectedUser, getConnectedUserParam, (err, response) => {
                if (err) {
                    reject({ error: err, message: "Database issue" })
                } else if (response.length) {
                    const updateUser = "UPDATE connected_users SET is_online = 1, socket_id = ? WHERE id = ?";
                    const updateUserParam = [socketId, response[0].id]
                    db.query(updateUser, updateUserParam, (err, updateUserResponse) => {
                        if (err) {
                            reject({ error: err, message: "Database issue" })
                        } else {
                            resolve("success")
                        }
                    });
                } else {
                    // const socketData = JSON.parse(JSON.stringify(socket));
                    const connectUser = "INSERT INTO connected_users (room_id, user_id, socket, socket_id) VALUES (?,?,?,?)";
                    const connectUserParam = [roomId, userId, "{}", socketId];
                    db.query(connectUser, connectUserParam, (err, connectUserResponse) => {
                        if (err) {
                            reject({ error: err, message: "Database issue" })
                        } else {
                            resolve("success")
                        }
                    });
                }
            })
        } else {
            reject({ error: "Invalid input", message: "Unable to connect" })
        }
    })
}

function checkValidRoom(req, res, next) {
    try {
        const roomUrl = req.body.roomUrl;
        const roomId = req.body.roomId;
        if (roomUrl && roomId) {
            const checkRoomSql = "SELECT room_id AS roomId ,room_url AS roomUrl FROM rooms WHERE room_url = ? AND room_id = ?";
            const checkRoomParams = [roomUrl, roomId];
            db.query(checkRoomSql, checkRoomParams, (err, roomDetail) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err)
                } else if (roomDetail.length) {
                    const data = {
                        roomUrl: roomDetail[0].roomUrl,
                        roomId: roomDetail[0].roomId
                    }
                    commonUtils.handleSuccessResponse(res, 200, data, "Room Exist");
                } else {
                    commonUtils.handleErrorResponse(res, 404, "Room not found")
                }
            })
        } else {
            commonUtils.handleErrorResponse(res, 400, "invalid input")
        }
    }
    catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function getRoomsList(req, res, next) {
    try {
        const userId = req.userDetails.id;
        if (userId) {
            const connectedRooms = "SELECT r.room_id AS roomId , r.room_name AS roomName FROM rooms r INNER JOIN connected_users cu ON r.room_id = cu.room_id WHERE cu.user_id = ?";
            const connectedRoomsParams = [userId];
            db.query(connectedRooms, connectedRoomsParams, (err, response) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err)
                } else if (response.length) {
                    const roomsId = response.map(room => room.roomId);
                    let roomsList = response.map((room) => {
                        room.users = [];
                        return room
                    });
                    const userListSql = "SELECT u.id,u.username, u.profile_pic AS profileImage, u.mobile_no, cu.room_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.room_id IN (?)";
                    const userListParam = [roomsId];
                    db.query(userListSql, userListParam, (err, usersList) => {
                        if (err) {
                            commonUtils.handleErrorResponse(res, 500, err)
                        } else if (usersList.length) {
                            roomsList = roomsList.map((room) => {
                                let userCount = 0;
                                usersList.forEach((user) => {
                                    if (user.room_id === room.roomId) {
                                        room.users.push(user)
                                        userCount++;
                                    }
                                })
                                room.userCount = userCount;
                                return room
                            })

                            const data = {
                                rooms: roomsList
                            }
                            commonUtils.handleSuccessResponse(res, 200, data);
                        } else {
                            const data = {
                                rooms: roomsList
                            }
                            commonUtils.handleSuccessResponse(res, 200, data);
                        }
                    });
                } else {
                    commonUtils.handleSuccessResponse(res, 200, {}, "You don't joined any room");
                }
            })
        } else {
            commonUtils.handleErrorResponse(res, 400, "User Id not valid")
        }
    }
    catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function createRoom(req, res, next) {
    try {
        const roomUrl = req.body.roomUrl;
        const roomName = req.body.roomName;
        const userId = req.userDetails.id;
        if (roomUrl && roomName) {
            const createRoomSql = "INSERT INTO rooms (room_url,room_name,created_by) VALUES (?,?,?)";
            const createRoomParams = [roomUrl, roomName, userId];
            db.query(createRoomSql, createRoomParams, (err, response) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err)
                } else {
                    const data = {
                        roomUrl,
                        roomId: response.insertId
                    }
                    commonUtils.handleSuccessResponse(res, 201, data, "Room created successfully");
                }
            })
        } else {
            commonUtils.handleErrorResponse(res, 400, "invalid input")
        }
    }
    catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
};

module.exports = { joinRoom, createRoom, checkValidRoom, getRoomsList }
