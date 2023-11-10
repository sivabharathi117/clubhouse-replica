var io = require('socket.io')
({path: '/io/webrtc'});

const peers = io.of('/webrtcPeer');
const rooms = {};
const messages = {};
let connectedDevices = 0;

function initializePeers(server) {
    io.listen(server);
    io.on('connection', socket => {
        console.log('connected')
    });

    peers.on('connection', socket => {
        console.log('peers connected')
        connectedDevices += 1;
        console.log('connected devices :' + connectedDevices);
        const room = socket.handshake.query.room

        rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)
        messages[room] = messages[room] || []

        socket.emit('connection-success', {
            success: socket.id,
            peerCount: rooms[room].size,
            messages: messages[room],
        })

        socket.on('disconnect', () => {
            console.log('disconnected')
            connectedDevices -= 1;
            console.log('connected devices :' + connectedDevices);
            rooms[room].delete(socket.id)
            messages[room] = rooms[room].size === 0 ? null : messages[room]
            disconnectedPeer(socket.id)
        })

        socket.on('new-message', (data) => {
            messages[room] = [...messages[room], JSON.parse(data.payload)]
        })

        /* Establish Connection When enter Room*/
        socket.on('onlinePeers', (data) => {
            console.log(socket?.handshake?.query?.userId,'User Joined Room',data.roomId)
            socket.join(data.roomId);
            peers.to(data.roomId).emit('online-peer', data.socketID)
        })

        /* Disconnect When leaves Room*/
        socket.on('offlinePeers', (data) => {
            console.log(socket?.handshake?.query?.userId,'User Left Room',data.roomId)
            socket.leave(data.roomId);
            peers.to(data.roomId).emit('offline-peer', data.socketID)
        })


        /* Send Candidate Data to myself*/
        socket.on('candidate', (data) => {
            socket.join(data.roomId);
            socket.broadcast.in(data.roomId).emit('candidate', {
                candidate: data.payload,
                socketID: data.socketID.local
            })
        })

        /* Send Offer Data to myself*/
        socket.on('offer', data => {
            for (const [socketID, socket] of peers.sockets.entries()) {
                if (socketID === data.socketID.remote) {
                    socket.emit('offer', {
                            sdp: data.payload.sdp,
                            socketID: data.socketID.local
                        }
                    )
                }
            }
            /*socket.join(data.roomId);
            socket.to(data.roomId).emit('offer', {
                sdp: data.payload.sdp,
                socketID: data.socketID.local
            })*/
        })

        /* Send Answer data to Group*/
        socket.on('answer', (data) => {
            socket.join(data.roomId);
            socket.broadcast.in(data.roomId).emit('answer', {
                sdp: data.payload.sdp,
                socketID: data.socketID.local
            })
        })

        /* Send LAT LNG data to Group*/
        socket.on('livelocation', (data) => {
            socket.join(data.roomId);
            socket.broadcast.in(data.roomId).emit('live-location', {
                lat: data.lat,
                lng: data.lng,
                userId:socket?.handshake?.query?.userId,
                socketID: data.socketID
            })
        })


        const broadcast = () => {
            const _connectedPeers = rooms[room]
            for (const [socketID, _socket] of _connectedPeers.entries()) {
                _socket.emit('joined-peers', {
                    peerCount: rooms[room].size,
                })
            }
        }
        broadcast()

        const disconnectedPeer = (socketID) => {
            const _connectedPeers = rooms[room]
            for (const [_socketID, _socket] of _connectedPeers.entries()) {
                _socket.emit('peer-disconnected', {
                    peerCount: rooms[room].size,
                    socketID
                })
            }
        }


    })
}

module.exports = initializePeers;
