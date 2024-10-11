import Bytestream from './bytestream';

export default class AgoraMessage {
  constructor (buffer) {
    const header = new DataView(buffer, 0, 6)
    this.uid = header.getUint32(0)
    this._type = header.getUint8(4)
    this.format = header.getUint8(5)
    this.body = new Uint8Array(buffer, 6)
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
  
  get bodyLength () {
    return this.body.byteLength * 8
  }
}