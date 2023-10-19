const io = require('socket.io')({ path: '/io/webrtc' });
const roomsController = require('./../controllers/roomsController');
const userController = require('./../controllers/userController');

let connectedDevices = 0;
const rooms = {}
const messages = {}

function initializePeers(server) {
    io.listen(server);
    io.on('connection', socket => {
        console.log('connected')
    });

    const peers = io.of('/webrtcPeer');
    peers.on('connection', async socket => {
        try {
            console.log('peers connected')
            connectedDevices += 1;
            console.log('connected devices :' + connectedDevices);
            const room = socket.handshake.query.room || "kjhfbvghgfre11111";
            const roomId = socket.handshake.query.roomId || 1;
            const userId = socket.handshake.query.userId || 1;
            socket.join(room)
            console.log('rooooooooooom', room);
            const joinRoom = await roomsController.joinRoom(userId, roomId, socket);
            const userDetail = await userController.getUserDetail(userId) || {};
            if (joinRoom) {
                // rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)
                // messages[room] = messages[room] || []


                // connectedPeers.set(socket.id, socket)

                const connectedUsers = await userController.getConnectedUsers(roomId);
                if (connectedUsers) {
                    socket.emit('connection-success', {
                        success: socket.id,
                        peerCount: connectedUsers.length
                    })
                }


                // const broadcast = () => socket.broadcast.emit('joined-peers', {
                //   peerCount: connectedPeers.size,
                // })
                const broadcast = async () => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);

                        // for (let user of _connectedUser) {
                        // if (socketID !== socket.id) {
                        // peers.to(room).emit('joined-peers', userDetail)
                        peers.to(room).emit('joined-peers', {
                            peerCount: _connectedUser.length, //connectedPeers.size,
                        })
                        // }
                        // }
                    } catch (error) {
                        console.log(error)
                    }

                }
                broadcast()

                // const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
                //   peerCount: connectedPeers.size,
                //   socketID: socketID
                // })
                const disconnectedPeer = async (socketID, userDetail) => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);
                        // for (const user of _connectedUser) {
                        peers.to(room).emit('peer-disconnected', {
                            peerCount: _connectedUser.length,
                            socketID,
                            username: userDetail.username,
                            profilePic: userDetail.profile_pic,
                            userId: userDetail.id
                        })
                        // }
                    } catch (error) {
                        console.log(error)
                    }
                }

                socket.on('new-message', (data) => {

                    // messages[room] = [...messages[room], JSON.parse(data.payload)]
                })

                socket.on('disconnect', async () => {
                    try {
                        console.log('disconnected')
                        connectedDevices -= 1;
                        console.log('connected devices :' + connectedDevices);
                        socket.leave(room);
                        // connectedPeers.delete(socket.id)
                        const disconnectUser = await userController.disconnectUser(socket.id);
                        if (disconnectUser) {
                            disconnectedPeer(socket.id, disconnectUser)
                        }
                    } catch (err) {
                        console.log(err)
                    }

                    // rooms[room].delete(socket.id)
                    // messages[room] = rooms[room].size === 0 ? null : messages[room]

                })


                socket.on('onlinePeers', async (data) => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);
                        for (let user of _connectedUser) {
                            // don't send to self
                            // if (socketID !== data.socketID.local) {
                            socket.emit('online-peer',
                                {
                                    socketID: user.socket_id,
                                    // username: user.username,
                                    // profilePic: user.profile_pic,
                                    userId: user.id
                                }
                            )
                            // socket.emit('online-peer', user.socket.id)
                            // }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                })

                socket.on('offer', async data => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);
                        for (let user of _connectedUser) {
                            // don't send to self
                            // if (user.socket_id === data.socketID.remote) {
                            socket.emit('offer', {
                                sdp: data.payload.sdp,
                                socketID: data.socketID.local,
                                userId: user.id
                            }
                            )
                            // }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                })

                socket.on('answer', async (data) => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);
                        for (let user of _connectedUser) {
                            if (user.socket_id === data.socketID.remote) {
                                socket.emit('answer', {
                                    sdp: data.payload.sdp,
                                    socketID: data.socketID.local
                                }
                                )
                            }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                })

                socket.on('candidate', async (data) => {
                    try {
                        const _connectedUser = await userController.getConnectedUsers(roomId);
                        // send candidate to the other peer(s) if any
                        for (let user of _connectedUser) {
                            if (user.socket_id === data.socketID.remote) {
                                socket.emit('candidate', {
                                    candidate: data.payload,
                                    socketID: data.socketID.local
                                })
                            }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                })
            }

        } catch (e) {
            console.log(e)
            let error;
            if (e.error && e.message) {
                error = {
                    error: e.error,
                    message: e.message
                }
            } else {
                error = {
                    error: e,
                    message: "something went wrong"
                }
            }
            socket.emit('error', error)
        }
    })
}

module.exports = initializePeers;
