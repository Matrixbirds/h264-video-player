import AgoraMessage from './agora-message';
import AudioDecoderController from './audio-decoder-controller';
import VideoDecoderController from './video-decoder-controller';
import EventBus from './event-bus';
import DecoderConsole from './log';
import VideoPacket from './protocol';

export default class AgoraMediaDecoder {
  static states = [
    'connecting',
    'connected',
    'close'
  ]

  static videoTypes = [
    'server',
    'client'
  ]

  static enableLog () {
    DecoderConsole.enableLog();
  }

  constructor (options) {
    this._init(options);
  }

  _init (options) {
    this._events = EventBus;

    this._options = options;

    this._videoPacketType = 'server';

    this._internalTimer = null;

    if (this._options.video) {
      this._video = new VideoDecoderController({
        id: this._options.id,
        useWorker: this._options.worker,
        useWebgl: this._options.webgl,
        render: this._options.render,
        reuseMemory: this._options.reuseMemory,
        size: {
          width: this._options.width,
          height: this._options.height,
        },
        analytics: this._options.analytics,
      });
    }

    if (this._options.audio) {
      this._audio = new AudioDecoderController();
    }

    this._socketState = 'close'
  }

  enableAnalytics() {
    this._setDataAnalytics();
    this._startAnalytics();
  }

  disableAnalytics() {
    this._stopAnalytics()
  }

  _setDataAnalytics () {
    this._analyticsData = {
      VideoFirstFrameDecodeElapsed: null,
      VideoFirstFrameRenderElapsed: null,
      VideoArrivedFrameRate: null, 
      VideoDecodeFrameRate: null,
      VideoRenderFrameRate: null,
      AudioArrivedPacketRate: null,
      VideoBitrate: null,
      IFrameRate: null,
      PFrameRate: null,
      SPSFrameRate: null,
      PPSFrameRate: null
    }

    this._events.on("DataDeserialized", ({type, len}) => {
      if (type == "video") {
        if (this._analyticsData.VideoArrivedFrameRate == null) {
          this._analyticsData.VideoArrivedFrameRate = 1
        } else {
          this._analyticsData.VideoArrivedFrameRate++
        }
        if (this._analyticsData.VideoBitrate == null) {
          this._analyticsData.VideoBitrate = len
        } else {
          this._analyticsData.VideoBitrate += len
        }
      }
      if (type == "audio") {
        if (this._analyticsData.AudioArrivedPacketRate == null) {
          this._analyticsData.AudioArrivedPacketRate = 1
        } else {
          this._analyticsData.AudioArrivedPacketRate++
        }
      }
    })

    this._events.once("VideoStream", (nal) => {
      console.log("VideoStream")
    })

    this._events.on("VideoStream", (nalu, type) => {
      const msg = new AgoraMessage(nalu.buffer);
      // const mediaNAL = new Uint8Array(nal.subarray(10));
      // console.log(`${msg.type}: ${msg.uid}`);
      this._events.emit("VideoFrameType", msg.frameType)
      this._options.video && this._video.decode(msg.body.buffer)
    })

    this._events.on("VideoFrameType", (type) => {
      switch (type) {
        case "P FRAME":
          if (this._analyticsData.PFrameRate == null) {
            this._analyticsData.PFrameRate = 1
          } else {
            this._analyticsData.PFrameRate++
          }
          break;
        case "I FRAME":
          if (this._analyticsData.IFrameRate == null) {
            this._analyticsData.IFrameRate = 1
          } else {
            this._analyticsData.IFrameRate++
          }
          break;
        case "SPS FRAME":
          if (this._analyticsData.SPSFrameRate == null) {
            this._analyticsData.SPSFrameRate = 1
          } else {
            this._analyticsData.SPSFrameRate++
          }
          break;
        case "PPS FRAME":
          if (this._analyticsData.PPSFrameRate == null) {
            this._analyticsData.PPSFrameRate = 1
          } else {
            this._analyticsData.PPSFrameRate++
          }
          break;
      }
    })

    this._events.once("VideoFrameDecodeCompleted", (elapsed) => {
      this._analyticsData.VideoFirstFrameDecodeElapsed = elapsed
    })
    this._events.on("VideoFrameDecodeCompleted", () => {
      if (this._analyticsData.VideoDecodeFrameRate == null) {
        this._analyticsData.VideoDecodeFrameRate = 1
      } else {
        this._analyticsData.VideoDecodeFrameRate++
      }
    })
    this._events.once("VideoFrameRenderCompleted", (elapsed) => {
      this._analyticsData.VideoFirstFrameRenderElapsed = elapsed
    })
    this._events.on("VideoFrameRenderCompleted", () => {
      if (this._analyticsData.VideoRenderFrameRate == null) {
        this._analyticsData.VideoRenderFrameRate = 1
      } else {
        this._analyticsData.VideoRenderFrameRate++
      }
    })
  }

  _startAnalytics () {
    if (this._internalTimer === null) {
      this._internalTimer = setInterval(() => {
        const analyticsData = {};
        for (let key of Object.keys(this._analyticsData)) {
          if (this._analyticsData[key] === null) {
            analyticsData[key] = 0
            continue;
          }

          if (['AudioArrivedPacketRate', 'VideoBitrate'].indexOf(key) != -1) {
            analyticsData[key] = +(this._analyticsData[key] / 1000).toFixed(2)
          } else {
            analyticsData[key] = +this._analyticsData[key].toFixed(2)
          }
        }

        // fresh analyticsData
        for (let key of Object.keys(this._analyticsData)) {
          if (['VideoFirstFrameDecodeElapsed', 'VideoFirstFrameRenderElapsed'].indexOf(key) == -1) {
            this._analyticsData[key] = 0
          }
        }
        this._events.emit("MediaStatistics", analyticsData);
      }, 1000)
    }
  }

  _stopAnalytics () {
    if (this._internalTimer) {
      clearInterval(this._internalTimer)
      this._internalTimer = null;
    }
  }

  updateSocketState (code, reason) {
    this._socketState = code;
    const branches = {
      connecting: () => {
      },
      connected: () => {
      },
      error: () => {
        DecoderConsole.log(`[ConnectionError]`, reason);
      },
      close: () => {

      }
    }
    branches[this._socketState] && branches[this._socketState]();
  }

  _startObserver () {
    if (this._options.analytics === true) {
      this.enableAnalytics();
    }

    this._events.on("ConnectionStateChanged", ({code, reason}) => {
      if (AgoraMediaDecoder.states.indexOf(code) == -1) {
        throw new Error(`[ConnectionStateChanged] error code is invalid code: ${code}, reason: ${reason}`);
      }
      this.updateSocketState(code, reason)
      DecoderConsole.log(`[ConnectionStateChanged] code: ${code}, reason: ${reason}`)
    })

    this._events.on("DataArrived", (data) => {
      if (this._socketState === 'connected') {
        if (this._videoPacketType === 'server') {
          this._handleSingleNALUnitData(data)
        }
        if (this._videoPacketType === 'client') {
          let packet = new VideoPacket(data)
          if (packet.type === 'video') {
            packet.parse();
          } else {
            this._handleSingleNALUnitData(data)
          }
          // TODO: deserialized video packet to NAL unit
        }
      }
    })

    this._events.on("VideoPacketTypeChanged", (type) => {
      this._videoPacketType = type;
      DecoderConsole.log(`[VideoPacketTypeChanged] type: ${type}`)
    })
  }
  
  _stopObserver() {
    this.disableAnalytics();
    this._events.removeAllListeners();
  }

  on(eventName, cb) {
    this._events.on(eventName, cb);
  }

  _handleSingleNALUnitData(arraybuffer) {
    const msg = new AgoraMessage(arraybuffer)
    this._events.emit("DataDeserialized", {
      type: msg.type,
      len: msg.bodyLength
    })

    if (msg.type == 'video') {
      // console.log(msg.body)
      this._events.emit("VideoFrameType", msg.frameType)
      this._options.video && this._video.decode(msg.body)
    }

    if (msg.type == 'audio') {
      this._options.audio && this._audio.decode(msg.body)
    }
  }

  attach(id) {
    // console.log("canvas", this._video.canvas)
    document.getElementById(id).appendChild(this._video.canvas);
    this._startObserver();
  }

  detach() {
    this._audio.stop();
    this._video.stop();
    this._video.canvas.remove();
    this._stopObserver();
  }
  
  emit(evtName, args) {
    this._events.emit(evtName, args);
  }

  updateConnectionState(code, reason) {
    this._events.emit('ConnectionStateChanged', {code, reason})
  }

  sendData(data) {
    this._events.emit('DataArrived', data)
  }

  setVideoPacketType(type) {
    if (AgoraMediaDecoder.videoTypes.indexOf(type) == -1) {
      throw new Error(`[setVideoPacketType] error invalid type ${type}`);
    }
    this._events.emit("VideoPacketTypeChanged", type || 'server')
  }

  videoResize(width, height) {
    this._video.resize(width, height);
  }

}
