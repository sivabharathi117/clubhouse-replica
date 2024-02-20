var io = require('socket.io')
    ({ path: '/io/webrtc' });

const peers = io.of('/webrtcPeer');
const db = require('./../database/database');
const { queryRunner } = require('./../database/db')
let connectedDevices = 0;

function initializePeers(server) {

    io.listen(server);

    peers.on('connection', socket => {
        console.log('peers connected')
        connectedDevices += 1;
        console.log('connected devices :' + connectedDevices);

        socket.emit('connection-success', {
            success: socket.id
        })

        socket.on('disconnect', () => {
            console.log('peers disconnected')
            connectedDevices -= 1;
            console.log('connected devices :' + connectedDevices);

            const updateLatLongQuery = "UPDATE connected_users SET is_online = 0 WHERE user_id = ?";
            const updateLatLongParams = [socket?.handshake?.query?.userId];
            db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
                if (err) {
                    console.log(`There is an error while updating offline status to the userId ${socket?.handshake?.query?.userId}`)
                } else {
                    if (response.affectedRows === 0) {
                        console.log(`There is No data to the userId ${socket?.handshake?.query?.userId}`)
                    }
                }
            });

            disconnectedPeer(socket.id)
        })

        /* Establish Connection When enter Room*/
        socket.on('onlinePeers', (data) => {
            console.log(socket?.handshake?.query?.userId, 'User Joined Room', data.roomId);
            socket.join(data.roomId);
            const updateLatLongQuery = "UPDATE connected_users SET is_online = 1, socket_id = ? WHERE room_id = ? AND user_id = ?";
            const updateLatLongParams = [data.socketID, data.roomId, socket?.handshake?.query?.userId];
            db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
                if (err) {
                    console.log(`There is an error while updating online room status to the userId ${socket?.handshake?.query?.userId}`)
                } else {
                    if (response.affectedRows === 0) {
                        console.log(`There is No data to the userId ${socket?.handshake?.query?.userId}`)
                    } else {
                        const fetchUserIdQuery = `SELECT user_id AS userId FROM connected_users WHERE room_id = ? AND is_online = 1;`;
                        const fetchUserParams = [data.roomId];
                        db.query(fetchUserIdQuery, fetchUserParams, (err, response) => {
                            if (err) {
                                console.log(`There is an error while fetching existing users id in the room ${data.roomId}`)
                            } else {
                                if (response.length === 0) {
                                    console.log(`There is an No existing users id in the room ${data.roomId}`)
                                } else {
                                    const userIds = response.map(item => item.userId)
                                    socket.emit('existing-peer', { userId: userIds });
                                    socket.broadcast.in(data.roomId).emit('existing-peer', { userId: [parseInt(socket?.handshake?.query?.userId)] })
                                    peers.to(data.roomId).emit('online-peer', {
                                        socketID: data.socketID,
                                        userId: parseInt(socket?.handshake?.query?.userId)
                                    })
                                }
                            }
                        });
                    }
                }
            });
        })

        /* Disconnect When leaves Room*/
        socket.on('offlinePeers', (data) => {
            console.log(socket?.handshake?.query?.userId, 'User Left Room', data.roomId)
            socket.leave(data.roomId);
            const updateLatLongQuery = "UPDATE connected_users SET is_online = 0 WHERE room_id = ? AND user_id = ?";
            const updateLatLongParams = [data.roomId, socket?.handshake?.query?.userId];
            db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
                if (err) {
                    console.log(`There is an error while updating offline status to the userId ${socket?.handshake?.query?.userId}`)
                } else {
                    if (response.affectedRows === 0) {
                        console.log(`There is No data to the userId ${socket?.handshake?.query?.userId}`)
                    } else {
                        peers.to(data.roomId).emit('offline-peer', {
                            socketID: data.socketID,
                            userId: parseInt(socket?.handshake?.query?.userId)
                        })
                    }
                }
            });
        })


        /* Send Candidate Data to Room */
        socket.on('candidate', (data) => {
            socket.broadcast.in(data.roomId).emit('candidate', {
                candidate: data.payload,
                socketID: data.socketID.local
            })
        })

        /* Send Offer Data to Room*/
        socket.on('offer', data => {
            const socketIdsInRoom = Array.from(peers.adapter.rooms.get(data.roomId) || []);
            if (socketIdsInRoom && socketIdsInRoom.length) {
                socketIdsInRoom.forEach((socketId) => {
                    if (socketId === data.socketID.remote) {
                        peers.to(socketId).emit('offer', {
                            sdp: data.payload.sdp,
                            socketID: data.socketID.local,
                            userId: parseInt(socket?.handshake?.query?.userId)
                        });
                    }
                })
            } else {
                console.log(`No socket ids in the room ${data.roomId}`)
            }
        })

        /* Send Answer data to Room*/
        socket.on('answer', (data) => {
            const socketIdsInRoom = Array.from(peers.adapter.rooms.get(data.roomId) || []);
            if (socketIdsInRoom && socketIdsInRoom.length) {
                socketIdsInRoom.forEach((socketId) => {
                    if (socketId === data.socketID.remote) {
                        peers.to(socketId).emit('answer', {
                            sdp: data.payload.sdp,
                            socketID: data.socketID.local
                        });
                    }
                })
            } else {
                console.log(`No socket ids in the room ${data.roomId}`)
            }
        })

        /* Send muted data to Group*/
        socket.on('mute', (data) => {
            const fetchSocketIdQuery = `SELECT socket_id AS socketId FROM connected_users WHERE is_online = ? AND user_id = ? AND room_id = ?;`;
            const fetchSocketIdParams = [1, data?.userId, data?.roomId];
            db.query(fetchSocketIdQuery, fetchSocketIdParams, (err, response) => {
                if (err) {
                    console.log(`There is an Error occuring while fetching socket Id to the user ${data?.userId}`)
                } else {
                    if (response.length === 0) {
                        console.log(`There is No socket Id to the user ${data?.userId}`)
                    } else {
                        peers.to(data?.roomId).emit('muted', {
                            userId: parseInt(data?.userId),
                            socketID: response[0].socketId,
                            isMute: data?.isMute
                        })
                    }
                }
            });
        })

        /* Send LAT LNG data to Group*/
        socket.on('livelocation', (data) => {
            socket.broadcast.to(data?.roomId).emit('live-location', {
                lat: data?.latlon?.lat,
                long: data?.latlon?.long,
                userId: parseInt(socket?.handshake?.query?.userId)
            })
            const updateLatLongQuery = "UPDATE connected_users SET latitude = ?, longitude = ? WHERE room_id = ? AND user_id = ?";
            const updateLatLongParams = [data?.latlon?.lat, data?.latlon?.long, data.roomId, socket?.handshake?.query?.userId];
            db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
                if (err) {
                    console.log(`There is an Error while updating latitude and longitude to the userId ${socket?.handshake?.query?.userId}`)
                } else {
                    if (response.affectedRows === 0) {
                        console.log(`There is No data for updating latitude and longitude to the userId ${socket?.handshake?.query?.userId}`)
                    } else {
                        const fetchLatLongGroupQuery = "SELECT user_id AS userId, latitude AS lat, longitude AS lon FROM connected_users WHERE room_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL AND is_online = 1 AND user_id != ?;";
                        const fetchLatLongParams = [data.roomId, socket?.handshake?.query?.userId];
                        db.query(fetchLatLongGroupQuery, fetchLatLongParams, (err, response) => {
                            if (err) {
                                console.log(`There is an Error while Fetching latitude and longitude from the roomId ${data.roomId}`)
                            } else {
                                if (response.length === 0) {
                                    console.log(`There is No data while Fetching latitude and longitude from the roomId ${data.roomId}`)
                                } else {
                                    response.forEach((ele) => {
                                        const latLon = {
                                            lat: parseFloat(ele.lat),
                                            long: parseFloat(ele.lon),
                                            userId: ele.userId
                                        }
                                        socket.emit('live-location', latLon);
                                    })
                                }
                                const checkRoomIdQuery = `SELECT room_id, latitude, longitude FROM room_destination WHERE room_id = ${data?.roomId};`
                                db.query(checkRoomIdQuery, (err, roomRes) => {
                                    if (err) {
                                        console.log('');
                                    } else {
                                        if (roomRes && roomRes.length) {
                                            socket.emit('group-destination', {
                                                lat: roomRes[0].latitude ? parseFloat(roomRes[0].latitude) : 0,
                                                long: roomRes[0].longitude ? parseFloat(roomRes[0].longitude) : 0,
                                            })
                                        }
                                    }
                                })
                            }
                        });
                    }
                }
            });
        })

        socket.on('eventStart', async (data) => {
            try {
                console.log('eventStart roomId', data.roomId);
                if (data.roomId && data.userId) {
                    addTempSong(data);
                }
                peers.emit('event-Start', {
                    bytes: data.song
                });
            } catch (error) {
                console.error('Error in eventStart:', error);
            }
        });

        socket.on('eventEnd', async (data) => {
            try {
                console.log('eventEnd roomId', data.roomId);
                if (data.roomId && data.userId) {
                    addFullSong(data);
                }
                peers.emit('event-End', { userId: data.userId });
            } catch (error) {
                console.error('Error in eventEnd:', error);
            }
        });

        /*Group destination*/
        socket.on('destination', (data) => {
            console.log('destination', data)
            const checkRoomIdQuery = `SELECT room_id FROM room_destination WHERE room_id = ${data?.roomId};`
            db.query(checkRoomIdQuery, (err, roomRes) => {
                if (err) {
                    console.log('');
                } else {
                    if (roomRes && roomRes.length) {
                        const updateDestinationCoordinatesQuery = `UPDATE room_destination  SET latitude = ?, longitude = ? WHERE room_id = ?;`;
                        const updateDestinationCoordinatesParams = [data?.latlon?.lat, data?.latlon?.long, data.roomId];
                        db.query(updateDestinationCoordinatesQuery, updateDestinationCoordinatesParams, (err, updateRes) => {
                            if (err) {
                                console.log('')
                            }
                        })
                    } else {
                        const insertDestinationCoordinatesQuery = `INSERT INTO room_destination (room_id, latitude, longitude) VALUES (?, ?, ?);`;
                        const insertDestinationCoordinatesParams = [data.roomId, data?.latlon?.lat, data?.latlon?.long];
                        db.query(insertDestinationCoordinatesQuery, insertDestinationCoordinatesParams, (err, insertRes) => {
                            if (err) {
                                console.log('')
                            }
                        })
                    }
                    peers.to(data?.roomId).emit('group-destination', {
                        lat: data?.latlon?.lat,
                        long: data?.latlon?.long,
                    })
                    console.log('group-destination', {
                        lat: data?.latlon?.lat,
                        long: data?.latlon?.long,
                    })
                }
            })
        })

        socket.on('playPause', async (data) => {
            try {
                peers.emit('play-pause', {});
            } catch (error) {
                console.error('Error in playPause:', error);
            }
        });

        socket.on('onSeek', async (data) => {
            try {
                peers.emit('seek-listen', data);
            } catch (error) {
                console.error('Error in onSeek:', error);
            }
        });

        const broadcast = () => {
            peers.emit('joined-peers', {})
        }
        broadcast()

        const disconnectedPeer = (socketID) => {
            peers.emit('peer-disconnected', { socketID })
        }


        /* To check receiving event */
        socket.onAny((eventName, ...args) => {
            console.log('Event Called From client---------->', eventName);
            //console.log('values', args); 
        });


        /* To check emitting events*/
        socket.onAnyOutgoing((eventName, ...args) => {
            console.log('Event Emitted From server =============>', eventName);
            // console.log('values', args); 
        });


    })
}

const addTempSong = async (req) => {
    try {
    const song = JSON.stringify(req.song);
    const addSongQuery = `INSERT INTO temp_room_song (room_id, user_id, song) VALUES (?, ?, ?)`;
    const addSongParams = [req.roomId, req.userId, song];
    await queryRunner(addSongQuery, addSongParams);
} catch (error) {
    console.error('Error in addTempSong:', error);
    return false;
}
};

const addFullSong = async (req) => {
    try {
        const tempSongQuery = `SELECT * FROM temp_room_song WHERE room_id = ? AND user_id = ? ORDER BY created_on ASC`;
        const tempSongParams = [req.roomId, req.userId];
        const response = await queryRunner(tempSongQuery, tempSongParams);
        if (response.isError || !response.data.length) {
            console.error('No data found in temp_room_song');
            return;
        }        
        const receivedSongBytes = response.data.map(data => Buffer.from(JSON.parse(data.song), 'base64'));
        const fullSong = JSON.stringify(Buffer.concat(receivedSongBytes));

        const deleteSongQuery = `DELETE FROM room_song WHERE room_id = ?`;
        const deleteParams = [req.roomId];
        await queryRunner(deleteSongQuery, deleteParams);

        const songQuery = `INSERT INTO room_song (room_id, user_id, song) VALUES (?, ?, ?)`;
        const songParams = [req.roomId, req.userId, fullSong];
        await queryRunner(songQuery, songParams);

        const deleteTempSongQuery = `DELETE FROM temp_room_song WHERE room_id = ?`;
        const deleteTempParams = [req.roomId];
        await queryRunner(deleteTempSongQuery, deleteTempParams);
       
        console.log('addFullSong successful');
    } catch (error) {
        console.error('Error in addFullSong:', error);
        return false;
    }
};

module.exports = {
    initializePeers: initializePeers,
    socketIO: peers
};

