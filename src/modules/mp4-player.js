
import Player from './player'
import EventBus from './event-bus';
export default class MP4Player {
  constructor(options) {
    this._options = options;

    this._events = EventBus;

    this.onStatisticsUpdated = function () {};

    this.player = new Player({
      id: this._options.id,
      useWorker: this._options.useWorker,
      reuseMemory: this._options.reuseMemory,
      webgl: this._options.useWebgl,
      size: this._options.size
    });
        
    this.player.onPictureDecoded = () => {
      this.updateStatistics()
    };

    this.player.onFrameDecodeCompleted = (elapsed) => {
      if (this._options.analytics) {
        this._events.emit("VideoFrameDecodeCompleted", elapsed);
      }
    }

    this.player.onFrameRenderCompleted = (elapsed) => {
      if (this._options.analytics) {
        this._events.emit("VideoFrameRenderCompleted", elapsed);
      }
    }
  }

  get canvas () {
    return this.player.canvas;
  }

  resize(width, height) {
    this.player.resize(width, height);
  }

  updateStatistics() {
    return;
  }

  decode (buf) {
    // this.nowTime = (new Date()).getTime()
    this.player.decode(buf)
  }
}