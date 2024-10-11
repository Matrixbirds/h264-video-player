

import EventBus from './event-bus';

const IP_PACKET_SIZE = 1500;
const NUM_PACKETS = 255;

class NALUint {
  constructor (type, data) {
    this.type = type;
    this.body = data;
  }
}

class SingleNAL {
  constructor (packet) {
    this.startCode = new Uint8Array(IP_PACKET_SIZE);
    const startCode = new Uint8Array(10);
    startCode.set(packet.uidBuffer);
    startCode.fill(0x01, 4, 6);
    startCode.fill(0, 6, 9);
    startCode.fill(1, 9, 10);
    this.startCode.set(startCode)
    this.startCode.set(packet.payloadData.subarray(packet.headerLength, packet.payloadDataLength), startCode.length);
  }

  static getNAL (packet) {
     let singalNAL = new SingleNAL(packet);
     const copyU8 = new Uint8Array(singalNAL.startCode.subarray(0, packet.payloadDataLength + 10));
     EventBus.emit("VideoStream", copyU8, "Single");
  }
}

class StapNAL {
  constructor (packet) {
    this.naluLength = packet.payloadDataLength - 1;
  }
  
  static getNAL(packet) {
    const stapa = new StapNAL(packet);
    const uidBuffer = packet.uidBuffer;
    let nalLength = stapa.naluLength;
    let copyU8 = new Uint8Array(packet.payloadData.subarray(packet.headerLength + 1));
    let nalu = copyU8;
    while (nalLength > 0) {
      if (nalLength < 2) {
        break;
      }
      const _nalu = new DataView(nalu.buffer);
      const naluSize = _nalu.getUint16();
      copyU8 = new Uint8Array(nalu.subarray(2));
      nalu = copyU8;
      nalLength -= 2;
      if (naluSize > nalLength) {
        break;
      }
      const startCode = new Uint8Array(IP_PACKET_SIZE)
      const format = new Uint8Array(10)
      format.set(uidBuffer);
      format.fill(0x01, 4, 6);
      format.fill(0, 6, 9);
      format.fill(1, 9, 10);
      startCode.set(format);
      startCode.set(nalu.subarray(0, naluSize+1), format.length);
      EventBus.emit("VideoStream", startCode.subarray(0, naluSize+10), 'Stap');
      copyU8 = new Uint8Array(nalu.subarray(naluSize));
      nalu = copyU8;
      nalLength -= naluSize;
    }
  }
}

class FuaNAL {
  constructor (packet) {
    this.payload = packet.payload.subarray()
    this.buffer = null;
    this.offset = 0;
  }

  get flag () {
    return this.payload[1] & 0xe0
  }

  get nal_fua () {
    return (this.payload[0] & 0xe0) | (this.payload[1] & 0x1F);
  }

  get startBit () {
    return this.flag === 0x80;
  }

  get endBit () {
    return this.flag === 0x40;
  }

  static getNAL (packet) {
    const fua = new FuaNAL(packet);
    const uidBuffer = packet.uidBuffer;
    // const uid = packet.uid;
    const payloadDataLength = packet.payloadDataLength;
    const headerLength = packet.headerLength;
    if (fua.startBit === true) { //fua-start
      let buffer = new Uint8Array(IP_PACKET_SIZE * NUM_PACKETS);
      fua.buffer = buffer;
      fua.offset = 0;
      const head = new Uint8Array(10);
      head.set(uidBuffer)
      head.fill(0x01, 4, 6);
      head.fill(0, 6, 9);
      head.fill(1, 9, 10);
      fua.buffer.set(head);
      fua.buffer.set(packet.payloadData.subarray(headerLength + 1, payloadDataLength - 1), head.length);
      fua.buffer.fill(fua.nal_fua, 10, 11);
      fua.offset += payloadDataLength + 10 - 1;
    } else if (fua.endBit === true) { //fua-end
      if (!fua.buffer) {
        return;
      }
      fua.buffer.set(packet.payloadData.subarray(headerLength + 2, payloadDataLength - 2), fua.offset);
      fua.offset += payloadDataLength - 2;
      const copyU8 = new Uint8Array(fua.buffer.subarray(0, fua.offset));
      EventBus.emit("VideoStream", copyU8, 'Fua');
      fua.buffer = null;
    } else { // middle
      if (!fua.buffer) {
        return;
      }
      fua.buffer.set(packet.payloadData.subarray(headerLength + 2, payloadDataLength - 2), fua.offset);
      fua.offset += payloadDataLength - 2;
    }
  }
}

export default class VideoPacket {
  constructor (buffer) {
    const bufferUint8 = new Uint8Array(buffer);
    const packetHeader = new DataView(buffer, 0, 10)
    this.uidBuffer = bufferUint8.subarray(0, 4);
    this.uid = packetHeader.getUint32(0)
    this._type = packetHeader.getUint8(4)
    this.format = packetHeader.getUint8(5)
    this.headerLength = packetHeader.getUint32(6)
    this.payloadData = bufferUint8.subarray(10);
    this.payloadDataLength = this.payloadData.byteLength - this.headerLength;
    this.payload = this.payloadData.subarray(this.headerLength);
  }

  parse() {
    const type = this.nalUnitType;
    let nal = null;
    switch (type) {
      case "FUA":
        nal = FuaNAL.getNAL(this);
      break;
      case "STAPA":
        nal = StapNAL.getNAL(this);
      break;
      default: 
        nal = SingleNAL.getNAL(this);
      break;
    }
    return nal;
  }

  get nalUnitType () {
    let _nalType = 'unknown';
    const nal_type = this.payload[0] & 0x1F;
    switch (nal_type) {
      case 6:
        _nalType = 'unknown';
        break;
      case 0x1c:
        _nalType = 'FUA';
        break;
      case 0x18:
        _nalType = 'STAPA';
        break;
    }
    return _nalType;
  }

  get type () {
    let _type = 'unknown'
    switch (this._type) {
      case 0x01 : {
        _type = 'video'
        break
      }
      case 0x03 :
      case 0x04 : 
        _type = 'audio'
        break
      default:
        _type = 'unknown'
        break
    }
    return _type
  }

  get frameType () {
    const data = this.body.buffer;
    const frameData = new Bytestream(data).read32()
    const val = frameData & 31
    let type = "unknown"
    switch (val) {
      case 1: {
        type = "P FRAME"
        break
      }
      case 5: {
        type = "I FRAME"
        break
      }
      case 7: {
        type = "SPS FRAME"
        break
      }
      case 8: {
        type = "PPS FRAME"
        break
      }
      default: {
        type = "unknown"
        break
      }
    }
    return type
  }
}