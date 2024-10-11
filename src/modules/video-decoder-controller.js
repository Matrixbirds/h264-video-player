import DecoderConsole from './log'
import MP4Player from './mp4-player';

export default class VideoDecoderController {
  constructor (options) {
    this._options = options;
    this._decoder = null;
    this.isPlaying = false;

    this._decoder = new MP4Player({
      id: this._options.id,
      useWorker: this._options.useWorker,
      useWebgl: this._options.useWebgl,
      render: this._options.render,
      reuseMemory: this._options.reuseMemory,
      size: this._options.size,
      analytics: this._options.analytics,
    });
  }

  resize(width, height) {
    this._decoder.resize(width, height);
  }

  get canvas () {
    return this._decoder.canvas;
  }

  decode (nalu) {
    if (!this.isPlaying) {
      this._play();
    }
    this._decoder.decode(nalu)
  }

  _play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      DecoderConsole.log("start video decoder")
    } else {
      DecoderConsole.warn("video decoder already played");
    }
  }

  _stop() {
    if(!this.isPlaying) {
      DecoderConsole.warn("video decoder already stoped");
    } else {
      this._isPlaying = false;
      DecoderConsole.log("stop video decoder");
    }
  }
}