const db = require('./../database/database');
const commonUtils = require('./../utils/commonUtils');
const uuid = require('uuid');

function joinRoom(req, res, next) {
    try {
        const userId = req.body.userId;
        const roomId = req.body.roomId;
        if (userId && roomId) {
            const socketId = "TEST-SOCKET";

            const getConnectedUser = "SELECT id FROM connected_users WHERE room_id = ? AND user_id = ?";
            const getConnectedUserParams = [roomId, userId];

            db.query(getConnectedUser, getConnectedUserParams, (err, response) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err);
                } else if (response.length) {
                    const updateUser = "UPDATE connected_users SET is_online = 1, socket_id = ? WHERE id = ?";
                    const updateUserParams = [socketId, response[0].id];

                    db.query(updateUser, updateUserParams, (err, updateUserResponse) => {
                        if (err) {
                            commonUtils.handleErrorResponse(res, 500, err);
                        } else {
                            commonUtils.handleSuccessResponse(res, 200, "User Joined successfully");
                        }
                    });
                } else {
                    const connectUser = "INSERT INTO connected_users (room_id, user_id, socket, socket_id) VALUES (?,?,?,?)";
                    const connectUserParams = [roomId, userId, "{}", socketId];

                    db.query(connectUser, connectUserParams, (err, connectUserResponse) => {
                        if (err) {
                            commonUtils.handleErrorResponse(res, 500, err);
                        } else {
                            if(!!req.body.joinRoom){
                                updateRoomInfo(req, res);
                            }else{
                                commonUtils.handleSuccessResponse(res, 200, "User Joined successfully");
                            }
                        }
                    });
                }
            });
        } else {
            commonUtils.handleErrorResponse(res, 400, "Invalid input");
        }
    } catch (err) {
        commonUtils.handleErrorResponse(res, 500, err);
    }
}

function checkValidRoom(req, res, next) {
    try {
        // const roomUrl = req.body.roomUrl;
        const roomId = req.body.roomId;
        const userId = req.userDetails.id;
        if (roomId) {
            const checkRoomSql = "SELECT room_id AS roomId,room_name AS roomName ,room_url AS roomUrl FROM rooms WHERE room_id = ?";
            const checkRoomParams = [roomId];
            db.query(checkRoomSql, checkRoomParams, (err, roomDetail) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err)
                } else if (roomDetail.length) {
                    const body = {
                        roomUrl: roomDetail[0].roomUrl,
                        roomName: roomDetail[0].roomName,
                        roomId,
                        userId,
                        joinRoom : true
                    }
                    // commonUtils.handleSuccessResponse(res, 200, data, "Room Exist");
                    joinRoom({body}, res, next);
                } else {
                    commonUtils.handleErrorResponse(res, 404, "Room not found")
                }
            })
        } else {
            commonUtils.handleErrorResponse(res, 400, "invalid input")
        }
    } catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function getRoomsList(req, res, next) {
    try {
        const userId = req.userDetails.id;
        if (userId) {
            const connectedRooms = `SELECT r.room_id AS roomId , r.room_name AS roomName, r.room_url AS roomURL,
                                    r.room_image_url AS roomImageUrl, r.destination_address AS destinationAddress, r.date_of_journey AS dateOfJourney
                                    FROM rooms r 
                                    INNER JOIN connected_users cu ON r.room_id = cu.room_id WHERE cu.user_id = ?`;
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
    } catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function createRoom(req, res, next) {
    try {
        const roomName = req.body.roomName;
        const roomImageUrl = req.body.roomImageUrl;
        const destinationAddress = req.body.destinationAddress;
        const dateOfJourney = req.body.dateOfJourney;
        const userId = req.userDetails.id;
        const roomUrl = uuid.v4();
        if (roomUrl && roomImageUrl && destinationAddress && dateOfJourney && roomName) {
            const createRoomSql = "INSERT INTO rooms (room_url, room_name, created_by, room_image_url, destination_address, date_of_journey) VALUES (?,?,?,?,?,?);";
            const createRoomParams = [roomUrl, roomName, userId, roomImageUrl, destinationAddress, dateOfJourney];
            db.query(createRoomSql, createRoomParams, (err, response) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err)
                } else {
                    /*const body = {

                        roomUrl: roomUrl,
                        roomId: response.insertId
                    }
                    commonUtils.handleSuccessResponse(res, 201, data, "Room created successfully");*/
                    joinRoom({body: {userId, roomId: response.insertId}}, res, next);

                }
            })
        } else {
            commonUtils.handleErrorResponse(res, 400, "invalid input")
        }
    } catch (err) {
        commonUtils.handleErrorResponse(res, 400, err)
    }
}

function updateRoom(req, res, next) {
    try {
        const roomName = req.body.roomName;
        const roomId = req.body.roomId;
        if (roomName && roomId) {
            const updateRoomSql = "UPDATE rooms SET room_name = ? WHERE room_id = ?";
            const updateRoomParams = [roomName, roomId];
            db.query(updateRoomSql, updateRoomParams, (err, response) => {
                if (err) {
                    commonUtils.handleErrorResponse(res, 500, err);
                } else {
                    if (response.affectedRows === 0) {
                        commonUtils.handleErrorResponse(res, 404, "Room not found");
                    } else {
                        const data = {
                            roomId
                        };
                        commonUtils.handleSuccessResponse(res, 200, data, "Room updated successfully");
                    }
                }
            });
        } else {
            commonUtils.handleErrorResponse(res, 400, "Invalid input");
        }
    } catch (err) {
        commonUtils.handleErrorResponse(res, 500, err);
    }
}

function updateRoomInfo(req, res) {
    const data = {
        roomId: req.body.roomId,
        roomName: req.body.roomName,
        roomURL: req.body.roomUrl,
        users: [],
    };

    const roomId = [req.body.roomId];

    const userListSql = `SELECT u.id, u.username, u.profile_pic AS profileImage, u.mobile_no, cu.room_id
                        FROM users u
                        INNER JOIN connected_users cu ON u.id = cu.user_id
                        WHERE cu.room_id IN (?)`;

    const userListParam = [[roomId]];
    db.query(userListSql, userListParam, (err, usersList) => {
        if (err) {
            commonUtils.handleErrorResponse(res, 500, err);
        } else {
            data.users = usersList;
            data.userCount = usersList.length;
            commonUtils.handleSuccessResponse(res, 200, data);
        }
    });
}


module.exports = { createRoom, updateRoom, checkValidRoom, getRoomsList}
