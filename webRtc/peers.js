var io = require('socket.io')
({path: '/io/webrtc'});

const peers = io.of('/webrtcPeer');
const db = require('./../database/database');
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
                                    socket.emit('existing-peer', {userId: userIds});
                                    socket.broadcast.in(data.roomId).emit('existing-peer', {userId: [parseInt(socket?.handshake?.query?.userId)]})
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
            if(socketIdsInRoom && socketIdsInRoom.length){
                socketIdsInRoom.forEach((socketId)=>{
                    if(socketId === data.socketID.remote){
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
            if(socketIdsInRoom && socketIdsInRoom.length){
                socketIdsInRoom.forEach((socketId)=>{
                    if(socketId === data.socketID.remote){
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
                            userId : parseInt(data?.userId),
                            socketID : response[0].socketId,
                            isMute : data?.isMute 
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


        /* To stream song to the Group */
        socket.on('eventStart', (data) => {
            peers.emit('event-Start', {
                bytes: data
            })
        })

        /* To notify song streaming done */
        socket.on('eventEnd', () => {
            peers.emit('event-End', {})
        })

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


        const broadcast = () => {
            peers.emit('joined-peers', {})
        }
        broadcast()

        const disconnectedPeer = (socketID) => {
            peers.emit('peer-disconnected', {socketID})
        }
       
      
        /* To check receiving event */
        // socket.onAny((eventName, ...args) => {
        //     console.log('Event Called From client---------->' , eventName);
        //     //console.log('values', args); 
        //   });


        /* To check emitting events*/
        socket.onAnyOutgoing((eventName, ...args) => {
            console.log('Event Emitted From server =============>' , eventName);
           // console.log('values', args); 
          });


    })
}

module.exports = {
    initializePeers: initializePeers,
    socketIO: peers
};



// var io = require('socket.io')
// ({path: '/io/webrtc'});

// const peers = io.of('/webrtcPeer');
// const rooms = {};
// const messages = {};
// let connectedDevices = 0;
// const db = require('./../database/database');

// function initializePeers(server) {

//     io.listen(server);
//     io.on('connection', socket => {
//         console.log('connected')
//     });

//     peers.on('connection', socket => {
//         console.log('peers connected')
//         connectedDevices += 1;
//         console.log('connected devices :' + connectedDevices);
//         const room = socket.handshake.query.room

//         rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)
//         messages[room] = messages[room] || []

//         socket.emit('connection-success', {
//             success: socket.id,
//             peerCount: rooms[room].size,
//             messages: messages[room],
//         })

//         socket.on('disconnect', () => {
//             console.log('disconnected')
//             connectedDevices -= 1;
//             console.log('connected devices :' + connectedDevices);
//             rooms[room].delete(socket.id)
//             messages[room] = rooms[room].size === 0 ? null : messages[room]
//             disconnectedPeer(socket.id)
//         })

//         socket.on('new-message', (data) => {
//             messages[room] = [...messages[room], JSON.parse(data.payload)]
//         })

//         /* Establish Connection When enter Room*/
//         socket.on('onlinePeers', (data) => {
//             console.log(socket?.handshake?.query?.userId, 'User Joined Room', data.roomId);
//             socket.join(data.roomId);
//             const updateLatLongQuery = "UPDATE connected_users SET is_online = 1, socket_id = ? WHERE room_id = ? AND user_id = ?";
//             const updateLatLongParams = [data.socketID, data.roomId, socket?.handshake?.query?.userId];
//             db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
//                 if (err) {
//                     console.log(`There is an error while updating online room status to the userId ${socket?.handshake?.query?.userId}`)
//                 } else {
//                     if (response.affectedRows === 0) {
//                         console.log(`There is No data to the userId ${socket?.handshake?.query?.userId}`)
//                     } else {
//                         const fetchUserIdQuery = `SELECT user_id AS userId FROM connected_users WHERE room_id = ? AND is_online = 1;`;
//                         const fetchUserParams = [data.roomId];
//                         db.query(fetchUserIdQuery, fetchUserParams, (err, response) => {
//                             if (err) {
//                                 console.log(`There is an error while fetching existing users id in the room ${data.roomId}`)
//                             } else {
//                                 if (response.length === 0) {
//                                     console.log(`There is an No existing users id in the room ${data.roomId}`)
//                                 } else {
//                                     socket.emit('existing-peer', {
//                                         userId: response.map(item => item.userId)
//                                     });
//                                     peers.to(data.roomId).emit('online-peer', {
//                                         socketID: data.socketID,
//                                         userId: parseInt(socket?.handshake?.query?.userId)
//                                     })
//                                 }
//                             }
//                         });
//                     }
//                 }
//             });
//         })

//         /* Disconnect When leaves Room*/
//         socket.on('offlinePeers', (data) => {
//             console.log(socket?.handshake?.query?.userId,'User Left Room',data.roomId)
//             socket.leave(data.roomId);
//            // peers.to(data.roomId).emit('offline-peer', data.socketID)
//             peers.to(data.roomId).emit('offline-peer', {
//                 socketID: data.socketID,
//                 userId: parseInt(socket?.handshake?.query?.userId)
//             })

//             const updateLatLongQuery = "UPDATE connected_users SET is_online = 0 WHERE room_id = ? AND user_id = ?";
//             const updateLatLongParams = [data.roomId, socket?.handshake?.query?.userId];
//             db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
//                 if (err) { 
//                     console.log(`There is an error while updating offline status to the userId ${socket?.handshake?.query?.userId}`)
//                 } else {
//                     if (response.affectedRows === 0) {
//                         console.log(`There is No data to the userId ${socket?.handshake?.query?.userId}`)
//                     }
//                 }
//             });
//         })


//         /* Send Candidate Data to myself*/
//         socket.on('candidate', (data) => {
//            socket.join(data.roomId);
//             socket.broadcast.in(data.roomId).emit('candidate', {
//                 candidate: data.payload,
//                 socketID: data.socketID.local
//             })
//         })

//         /* Send Offer Data to myself*/
//         socket.on('offer', data => {
//             socket.join(data.roomId);
//             if (peers.adapter.rooms.has(data.roomId)) {
//                 for (const [socketID, socket] of peers.sockets.entries()) {
//                     if (socketID === data.socketID.remote) {
//                         socket.emit('offer', {
//                                 sdp: data.payload.sdp,
//                                 socketID: data.socketID.local,
//                                 userId: parseInt(socket?.handshake?.query?.userId)
//                             }
//                         )
//                     }
//                 }
//             }
//         })

//         /* Send Answer data to Group*/
//         socket.on('answer', (data) => {
//             socket.join(data.roomId);
//             if(peers.adapter.rooms.has(data.roomId)){
//                 const _connectedPeers = rooms[room];
//                 for (const [socketID, socket] of _connectedPeers.entries()) {
//                     if (socketID === data.socketID.remote) {
//                         socket.emit('answer', {
//                             sdp: data.payload.sdp,
//                             socketID: data.socketID.local
//                         })
//                     }
//                 }
//             }
//         })

//         /* Send muted data to Group*/
//         socket.on('mute', (data) => {
//             console.log('mute', data);
//             socket.join(data?.roomId);
            
//             const fetchLatLongGroupQuery = `SELECT socket_id AS socketId FROM connected_users WHERE is_online = 1 AND user_id = ${data?.userId};`;
//             db.query(fetchLatLongGroupQuery, (err, response) => {
//                 if (err) {
//                     console.log(``)
//                 } else {
//                     if (response.length === 0) {
//                         console.log(``)
//                     } else {
//                         peers.to(data?.roomId).emit('muted', {
//                             userId : parseInt(data?.userId),
//                             socketID : response[0].socketId,
//                             isMute : data?.isMute 
//                         })
//                     }
//                 }
//             });
//         })

//         /* Send LAT LNG data to Group*/
//         socket.on('livelocation', (data) => {
//             socket.join(18);
//             socket.broadcast.to(18).emit('live-location', {
//                 lat: data?.latlon?.lat,
//                 lon: data?.latlon?.long,
//                 userId:parseInt(socket?.handshake?.query?.userId)
//             })
//             // const updateLatLongQuery = "UPDATE connected_users SET latitude = ?, longitude = ? WHERE room_id = ? AND user_id = ?";
//             // const updateLatLongParams = [data?.latlon?.lat, data?.latlon?.long,  data.roomId, socket?.handshake?.query?.userId];
//             // db.query(updateLatLongQuery, updateLatLongParams, (err, response) => {
//             //     if (err) { 
//             //         console.log(`There is an Error while updating latitude and longitude to the userId ${socket?.handshake?.query?.userId}`)
//             //     } else {
//             //         if (response.affectedRows === 0) {
//             //             console.log(`There is No data for updating latitude and longitude to the userId ${socket?.handshake?.query?.userId}`)
//             //         } else {
//             //             const fetchLatLongGroupQuery = `SELECT user_id AS userId, latitude AS lat, longitude AS lon FROM connected_users WHERE room_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL AND is_online = 1 AND user_id != ${socket?.handshake?.query?.userId};`;
//             //             const fetchLatLongParams = [data.roomId];
//             //             db.query(fetchLatLongGroupQuery, fetchLatLongParams, (err, response) => {
//             //                 if (err) {
//             //                     console.log(`There is an Error while Fetching latitude and longitude from the roomId ${data.roomId}`)
//             //                 } else {
//             //                     if (response.length === 0) {
//             //                         console.log(`There is No data while Fetching latitude and longitude from the roomId ${data.roomId}`)
//             //                     } else {
//             //                         socket.emit('live-location', response)
//             //                     }
//             //                 }
//             //             });
//             //         }
//             //     }
//             // });
//         })


//         const broadcast = () => {
//             const _connectedPeers = rooms[room]
//             for (const [socketID, _socket] of _connectedPeers.entries()) {
//                 _socket.emit('joined-peers', {
//                     peerCount: rooms[room].size,
//                 })
//             }
//         }
//         broadcast()

//         const disconnectedPeer = (socketID) => {
//             const _connectedPeers = rooms[room]
//             for (const [_socketID, _socket] of _connectedPeers.entries()) {
//                 _socket.emit('peer-disconnected', {
//                     peerCount: rooms[room].size,
//                     socketID
//                 })
//             }
//         }
       
//         socket.on('testing', (data) => {
//             console.log('testing')
//             peers.emit('testing-testing', {
//                 bytes : data
//             })
//         })

//         /* To check receiving event */
//         // socket.onAny((eventName, ...args) => {
//         //     console.log('Event Called From client' , eventName);
//         //     console.log('values', args); 
//         //   });


//         /* To check emitting events*/
//         socket.onAnyOutgoing((eventName, ...args) => {
//             console.log('Event Emitted From server =============>' , eventName);
//            // console.log('values', args); 
//           });


//     })
// }

// module.exports = {
//     initializePeers: initializePeers,
//     socketIO: peers
// };
