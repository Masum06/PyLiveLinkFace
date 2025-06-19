const dgram = require('dgram');
const { LiveLinkFace, FaceBlendShape } = require('../js/livelinkface');

const UDP_PORT = 11111;
const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
    const [success, face] = LiveLinkFace.decode(msg);
    if (success) {
        const pitch = face.getBlendshape(FaceBlendShape.HeadPitch);
        console.log(face.name, pitch);
    }
});

server.bind(UDP_PORT);
