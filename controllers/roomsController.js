const db = require('./../database/database');

function joinRoom(userId, roomId, socket) {
    return new Promise((resolve, reject) => {
        if (userId && socket && roomId) {
            const socketId = socket.id;
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

module.exports = { joinRoom, createRoom, checkValidRoom }
