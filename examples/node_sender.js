const dgram = require('dgram');
const { LiveLinkFace, FaceBlendShape } = require('../js/livelinkface');

const UDP_IP = '127.0.0.1';
const UDP_PORT = 11111;

const face = new LiveLinkFace();
const client = dgram.createSocket('udp4');

setInterval(() => {
    face.setBlendshape(FaceBlendShape.HeadPitch, Math.random() * 2 - 1);
    face.setBlendshape(FaceBlendShape.HeadRoll, Math.random() * 2 - 1);
    face.setBlendshape(FaceBlendShape.HeadYaw, Math.random() * 2 - 1);
    const data = face.encode();
    client.send(data, UDP_PORT, UDP_IP);
}, 100);
