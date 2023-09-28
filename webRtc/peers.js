var io = require('socket.io')
    ({
        path: '/io/webrtc'
    });
let connectedDevices = 0;
const rooms = {}
const messages = {}

function initializePeers(server) {
    io.listen(server);
    io.on('connection', socket => {
        console.log('connected')
    });

    const peers = io.of('/webrtcPeer');
    peers.on('connection', socket => {
        console.log('peers connected')
        connectedDevices += 1;
        console.log('connected devices :' + connectedDevices);
        const room = socket.handshake.query.room
        console.log('rooooooooooom', room);

        rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)
        messages[room] = messages[room] || []

        // console.log('rooooooom', rooms);
        // console.log('messages', messages);

        // connectedPeers.set(socket.id, socket)

        // console.log(socket.id, room)
        socket.emit('connection-success', {
            success: socket.id,
            peerCount: rooms[room].size,
            messages: messages[room],
        })

        // const broadcast = () => socket.broadcast.emit('joined-peers', {
        //   peerCount: connectedPeers.size,
        // })
        const broadcast = () => {
            const _connectedPeers = rooms[room]

            for (const [socketID, _socket] of _connectedPeers.entries()) {
                // if (socketID !== socket.id) {
                _socket.emit('joined-peers', {
                    peerCount: rooms[room].size, //connectedPeers.size,
                })
                // }
            }
        }
        broadcast()

        // const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
        //   peerCount: connectedPeers.size,
        //   socketID: socketID
        // })
        const disconnectedPeer = (socketID) => {
            const _connectedPeers = rooms[room]
            for (const [_socketID, _socket] of _connectedPeers.entries()) {
                _socket.emit('peer-disconnected', {
                    peerCount: rooms[room].size,
                    socketID
                })
            }
        }

        socket.on('new-message', (data) => {
            // console.log('new-message', JSON.parse(data.payload))

            messages[room] = [...messages[room], JSON.parse(data.payload)]
        })

        socket.on('disconnect', () => {
            console.log('disconnected')
            connectedDevices -= 1;
            console.log('connected devices :' + connectedDevices);
            // connectedPeers.delete(socket.id)
            rooms[room].delete(socket.id)
            messages[room] = rooms[room].size === 0 ? null : messages[room]
            disconnectedPeer(socket.id)
        })

        // ************************************* //
        // NOT REQUIRED
        // ************************************* //
        // socket.on('socket-to-disconnect', (socketIDToDisconnect) => {
        //   console.log('disconnected')

        //   // connectedPeers.delete(socket.id)
        //   rooms[room].delete(socketIDToDisconnect)
        //   messages[room] = rooms[room].size === 0 ? null : messages[room]
        //   disconnectedPeer(socketIDToDisconnect)
        // })

        socket.on('onlinePeers', (data) => {
            const _connectedPeers = rooms[room]
            for (const [socketID, _socket] of _connectedPeers.entries()) {
                // don't send to self
                if (socketID !== data.socketID.local) {
                    // console.log('online-peer', data.socketID, socketID)
                    socket.emit('online-peer', socketID)
                }
            }
        })

        socket.on('offer', data => {
            // console.log(data)
            const _connectedPeers = rooms[room]
            for (const [socketID, socket] of _connectedPeers.entries()) {
                // don't send to self
                if (socketID === data.socketID.remote) {
                    // console.log('Offer', socketID, data.socketID, data.payload.type)
                    socket.emit('offer', {
                        sdp: data.payload.sdp,
                        socketID: data.socketID.local
                    }
                    )
                }
            }
        })

        socket.on('answer', (data) => {
            // console.log(data)
            const _connectedPeers = rooms[room]
            for (const [socketID, socket] of _connectedPeers.entries()) {
                if (socketID === data.socketID.remote) {
                    // console.log('Answer', socketID, data.socketID, data.payload.type)
                    socket.emit('answer', {
                        sdp: data.payload.sdp,
                        socketID: data.socketID.local
                    }
                    )
                }
            }
        })

        // socket.on('offerOrAnswer', (data) => {
        //   // send to the other peer(s) if any
        //   for (const [socketID, socket] of connectedPeers.entries()) {
        //     // don't send to self
        //     if (socketID !== data.socketID) {
        //       console.log(socketID, data.payload.type)
        //       socket.emit('offerOrAnswer', data.payload)
        //     }
        //   }
        // })

        socket.on('candidate', (data) => {
            // console.log(data)
            const _connectedPeers = rooms[room]
            // send candidate to the other peer(s) if any
            for (const [socketID, socket] of _connectedPeers.entries()) {
                if (socketID === data.socketID.remote) {
                    socket.emit('candidate', {
                        candidate: data.payload,
                        socketID: data.socketID.local
                    })
                }
            }
        })

    })
}

module.exports = initializePeers;
