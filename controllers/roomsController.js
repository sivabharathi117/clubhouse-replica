const db = require('./../database/database');

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
                    const errorData = {
                        status: "failure",
                        code: 500,
                        error: err
                    }
                    res.status(500).send(errorData);
                } else if (roomDetail.length) {
                    const responseData = {
                        status: "success",
                        code: 200,
                        message: "Room Exist",
                        data: {
                            roomUrl: roomDetail[0].roomUrl,
                            roomId: roomDetail[0].roomId
                        }
                    }
                    res.send(responseData);
                } else {
                    const errorData = {
                        status: "failure",
                        code: 404,
                        error: "Room not found"
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
    }
    catch (err) {
        const errorData = {
            status: "failure",
            code: 400,
            error: err
        }
        res.status(400).send(errorData);
    }
}

function getRoomsList(req, res, next) {
    try {
        const userId = req.userDetails.id;
        if (userId) {
            const connectedRooms = "SELECT r.room_id AS roomId , r.room_name AS roomName FROM rooms r INNER JOIN connected_users cu ON r.room_id = cu.room_id WHERE cu.user_id = ?";
            const connectedRoomsParams = [1];
            db.query(connectedRooms, connectedRoomsParams, (err, response) => {
                if (err) {
                    const errorData = {
                        status: "failure",
                        code: 500,
                        error: err
                    }
                    res.status(500).send(errorData);
                } else if (response.length) {
                    const roomsId = response.map(room => room.roomId);
                    let roomsList = response.map((room) => {
                        room.users = [];
                        return room
                    });
                    const userListSql = "SELECT u.id,u.username, u.profile_pic, u.mobile_no, cu.room_id from users u INNER JOIN connected_users cu ON u.id = cu.user_id WHERE cu.room_id IN (?)";
                    const userListParam = [roomsId];
                    db.query(userListSql, userListParam, (err, usersList) => {
                        if (err) {
                            const errorData = {
                                status: "failure",
                                code: 500,
                                error: err
                            }
                            res.status(500).send(errorData);
                        } else if (usersList.length) {
                            roomsList = roomsList.map((room) => {
                                usersList.forEach((user) => {
                                    if (user.room_id === room.roomId) {
                                        room.users.push(user)
                                    }
                                })
                                return room
                            })
                            const responseData = {
                                status: "success",
                                code: 200,
                                data: {
                                    rooms: roomsList
                                }
                            }
                            res.send(responseData);
                        } else {
                            const responseData = {
                                status: "success",
                                code: 200,
                                data: {
                                    rooms: roomsList
                                }
                            }
                            res.send(responseData);
                        }
                    });
                } else {
                    const responseData = {
                        status: "success",
                        code: 200,
                        message: "You don't joined any room",
                        data: {
                            rooms: []
                        }
                    }
                    res.send(responseData);
                }
            })
        } else {
            const errorData = {
                status: "failure",
                code: 400,
                error: "User Id not valid"
            }
            res.status(400).send(errorData);
        }
    }
    catch (err) {
        const errorData = {
            status: "failure",
            code: 400,
            error: err
        }
        res.status(400).send(errorData);
    }
}

function createRoom(req, res, next) {
    try {
        const roomUrl = req.body.roomUrl;
        const roomName = req.body.roomName;
        if (roomUrl && roomName) {
            const createRoomSql = "INSERT INTO rooms (room_url,room_name) VALUES (?,?)";
            const createRoomParams = [roomUrl, roomName];
            db.query(createRoomSql, createRoomParams, (err, response) => {
                if (err) {
                    const errorData = {
                        status: "failure",
                        code: 500,
                        error: err
                    }
                    res.status(500).send(errorData);
                } else {
                    const responseData = {
                        status: "success",
                        code: 201,
                        message: "Room created successfully",
                        data: {
                            roomUrl,
                            roomId: response.insertId
                        }
                    }
                    res.send(responseData);
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
    }
    catch (err) {
        const errorData = {
            status: "failure",
            code: 400,
            error: err
        }
        res.status(400).send(errorData);
    }
};

module.exports = { joinRoom, createRoom, checkValidRoom, getRoomsList }
