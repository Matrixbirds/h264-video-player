import DecoderConsole from './log'

export default class AudioDecoderController {
  constructor () {
    this._decoder = new AudioDecoder();
    this._isPlaying = false;
  }

  set isPlaying (val) {
    this._isPlaying = val;
  }

  get isPlaying () {
    return this._isPlaying;
  }

  decode (packet) {
    if (!this.isPlaying) {
      this._play();
    }
    this._decoder.readPacket(packet)
  }

  _play() {
    if (!this.isPlaying) {
      this._decoder.play()
      this.isPlaying = true;
      DecoderConsole.log("start audio decoder");
    } else {
      DecoderConsole.warn("audio decoder already played");
    }
  }

  _stop() {
    if(!this.isPlaying) {
      this._decoder.stop();
      DecoderConsole.warn("audio decoder already stoped");
    } else {
      this.isPlaying = false;
      DecoderConsole.log("stop audio decoder");
    }
  }
}