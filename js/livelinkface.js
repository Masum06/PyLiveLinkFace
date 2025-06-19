'use strict';

const FaceBlendShape = Object.freeze({
    EyeBlinkLeft: 0,
    EyeLookDownLeft: 1,
    EyeLookInLeft: 2,
    EyeLookOutLeft: 3,
    EyeLookUpLeft: 4,
    EyeSquintLeft: 5,
    EyeWideLeft: 6,
    EyeBlinkRight: 7,
    EyeLookDownRight: 8,
    EyeLookInRight: 9,
    EyeLookOutRight: 10,
    EyeLookUpRight: 11,
    EyeSquintRight: 12,
    EyeWideRight: 13,
    JawForward: 14,
    JawLeft: 15,
    JawRight: 16,
    JawOpen: 17,
    MouthClose: 18,
    MouthFunnel: 19,
    MouthPucker: 20,
    MouthLeft: 21,
    MouthRight: 22,
    MouthSmileLeft: 23,
    MouthSmileRight: 24,
    MouthFrownLeft: 25,
    MouthFrownRight: 26,
    MouthDimpleLeft: 27,
    MouthDimpleRight: 28,
    MouthStretchLeft: 29,
    MouthStretchRight: 30,
    MouthRollLower: 31,
    MouthRollUpper: 32,
    MouthShrugLower: 33,
    MouthShrugUpper: 34,
    MouthPressLeft: 35,
    MouthPressRight: 36,
    MouthLowerDownLeft: 37,
    MouthLowerDownRight: 38,
    MouthUpperUpLeft: 39,
    MouthUpperUpRight: 40,
    BrowDownLeft: 41,
    BrowDownRight: 42,
    BrowInnerUp: 43,
    BrowOuterUpLeft: 44,
    BrowOuterUpRight: 45,
    CheekPuff: 46,
    CheekSquintLeft: 47,
    CheekSquintRight: 48,
    NoseSneerLeft: 49,
    NoseSneerRight: 50,
    TongueOut: 51,
    HeadYaw: 52,
    HeadPitch: 53,
    HeadRoll: 54,
    LeftEyeYaw: 55,
    LeftEyePitch: 56,
    LeftEyeRoll: 57,
    RightEyeYaw: 58,
    RightEyePitch: 59,
    RightEyeRoll: 60
});

class LiveLinkFace {
    constructor(name = 'Node_LiveLinkFace', uuid = null, fps = 60, filterSize = 5) {
        this.uuid = uuid || `$${crypto.randomUUID()}`;
        this.name = name;
        this.fps = fps;
        this._filterSize = filterSize;

        this._version = 6;
        const now = new Date();
        this._frames = LiveLinkFace._calcFrameNumber(now, this._fps);
        this._subFrame = 1056060032; // bit pattern for 0.473...
        this._denominator = Math.floor(this._fps / 60);
        this._blendShapes = Array(61).fill(0.0);
        this._oldBlendShapes = Array.from({ length: 61 }, () => []);
    }

    static _calcFrameNumber(date, fps) {
        const totalSeconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
        const frameFloat = totalSeconds * fps + (date.getMilliseconds() / 1000) * fps;
        return Math.floor(frameFloat);
    }

    get uuid() {
        return this._uuid;
    }

    set uuid(value) {
        if (!value.startsWith('$')) {
            this._uuid = `$${value}`;
        } else {
            this._uuid = value;
        }
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get fps() {
        return this._fps;
    }

    set fps(value) {
        if (value < 1) {
            throw new Error('Only fps values greater than 1 are allowed.');
        }
        this._fps = value;
    }

    encode() {
        const versionBuf = Buffer.alloc(4);
        versionBuf.writeUInt32LE(this._version, 0);
        const uuidBuf = Buffer.from(this._uuid, 'utf8');
        const nameBuf = Buffer.from(this._name, 'utf8');
        const nameLenBuf = Buffer.alloc(4);
        nameLenBuf.writeInt32BE(nameBuf.length, 0);

        const now = new Date();
        const frames = LiveLinkFace._calcFrameNumber(now, this._fps);
        const frameBuf = Buffer.alloc(8);
        frameBuf.writeUInt32BE(frames, 0);
        frameBuf.writeUInt32BE(this._subFrame, 4);

        const rateBuf = Buffer.alloc(8);
        rateBuf.writeUInt32BE(this._fps, 0);
        rateBuf.writeUInt32BE(this._denominator, 4);

        const dataBuf = Buffer.alloc(1 + 61 * 4);
        dataBuf.writeUInt8(61, 0);
        for (let i = 0; i < 61; i++) {
            dataBuf.writeFloatBE(this._blendShapes[i], 1 + i * 4);
        }

        return Buffer.concat([versionBuf, uuidBuf, nameLenBuf, nameBuf, frameBuf, rateBuf, dataBuf]);
    }

    getBlendshape(index) {
        return this._blendShapes[index];
    }

    setBlendshape(index, value, noFilter = true) {
        if (noFilter) {
            this._blendShapes[index] = value;
        } else {
            const arr = this._oldBlendShapes[index];
            arr.push(value);
            if (arr.length > this._filterSize) arr.shift();
            const sum = arr.reduce((a, b) => a + b, 0);
            this._blendShapes[index] = sum / arr.length;
        }
    }

    static decode(buf) {
        const version = buf.readInt32LE(0);
        const uuid = buf.slice(4, 41).toString('utf8');
        const nameLen = buf.readInt32BE(41);
        const nameEnd = 45 + nameLen;
        const name = buf.slice(45, nameEnd).toString('utf8');
        if (buf.length > nameEnd + 16) {
            const frameNumber = buf.readInt32BE(nameEnd);
            const subFrame = buf.readFloatBE(nameEnd + 4);
            const fps = buf.readInt32BE(nameEnd + 8);
            const denominator = buf.readInt32BE(nameEnd + 12);
            const dataLength = buf.readInt8(nameEnd + 16);
            if (dataLength !== 61) {
                throw new Error(`Blend shape length is ${dataLength} but should be 61`);
            }
            const data = [];
            for (let i = 0; i < 61; i++) {
                data.push(buf.readFloatBE(nameEnd + 17 + i * 4));
            }
            const llf = new LiveLinkFace(name, uuid, fps);
            llf._version = version;
            llf._frames = frameNumber;
            llf._subFrame = subFrame;
            llf._denominator = denominator;
            llf._blendShapes = data;
            return [true, llf];
        }
        return [false, new LiveLinkFace()];
    }
}

module.exports = { LiveLinkFace, FaceBlendShape };
