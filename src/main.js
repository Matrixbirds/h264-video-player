import AgoraMediaDecoder from './modules/agora-media-decoder';
import Adapter from './adapter';
import CustomComponent from './utils/component'

AgoraMediaDecoder.enableLog();

function qs() {
  return window.location.href.split("?")[1]
}

function getUid() {
  const qstr = qs()
  if (!qstr) return null
  const items = qstr.split("=")
  let obj = {}
  for (let i = 0; i < items.length; i+=2) {
    obj = {
      ...obj,
      [`${items[i]}`]: +items[i+1],
    }
  }
  return obj.uid
}

class SDK {
  constructor() {
    this.socket = null
    this._decoder = new AgoraMediaDecoder({
      id: 'canvas-player',
      width: 640,
      height: 480,
      worker: true,
      webgl: true,
      analytics: true,
      render: true,
      reuseMemory: true,
      video: true,
      audio: true,
    })
    this._decoder.attach('h264-decoder');
    this._decoder.setVideoPacketType('client');
  }

  async init (uid) {
    let url = $WEBSOCKET_URL
    url = url.replace('$uid', uid || 1)
    const socket = new Adapter(url)

    const decoder = this._decoder;
    
    decoder.updateConnectionState("connecting")

    socket.on("open", () => {
      decoder.updateConnectionState("connected")
    })

    socket.on("message", ({data}) => {
      const blob = data;
      const fr = new FileReader ()
      const that = this;
      fr.onload = function () {
        const arraybuffer = this.result
        socket.emit("data", arraybuffer)
      }
      fr.readAsArrayBuffer(blob)
    })

    socket.on("error", (err) => {
      decoder.updateConnectionState("close", err)
      console.log("[websocket] error", JSON.stringify(err))
    })

    socket.on("close", (evt) => {
      decoder.updateConnectionState("close", "disconnect")
      console.log("[websocket] closed", evt)
    })

    socket.on("data", (arraybuffer) => {
      decoder.sendData(arraybuffer)
    })
    // this.internalDataCapture()
    this.socket = socket
    return socket.connect()
  }

  get decoder () {
    return this._decoder;
  }
}

function q(idStr) {
  return document.querySelector(idStr)
}

function initUI() {
  const div = q("#h264-decoder")
  const controls = document.createElement('div');
  controls.setAttribute('style', "z-index: 100; position: absolute; bottom: 0px; opacity: 0.7; background-color: rgba(0,0,0,0.8); height: 30px; width: 100%; text-align: left;");
  const info = document.createElement('div');
  info.setAttribute('class', 'profile');
  controls.appendChild(info);
  div.appendChild(controls);

  const infoStrPre = "[info] ";
  let infoStr = "";
  // if (useWorker){
    infoStr += "worker thread ";
  // }else{
  //   infoStr += "main thread ";
  // };
  
  infoStr += " - webgl: " + true;
  const subtitle = `${infoStrPre} ${infoStr}`;
  const span = new CustomComponent('span', {
    id: 'subtitle',
    content: subtitle,
    class: 'item'
  })

  const input = new CustomComponent('input', {
    id: 'uid',
    name: 'uid',
    type: 'number',
    placeholder: 'enter uid',
  })

  const button = new CustomComponent('button', {
    id: 'confirm',
    content: 'start'
  })

  button.on("click", () => {
    window.location.href = window.location.href.split("?")[0] + "?uid=" + input.dom.value
  })

  const row = new CustomComponent('div', {
    class: 'item'
  })


  const profileBtn = new CustomComponent('button', {
    id: 'profile',
    content: 'toggleProfile'
  })

  row.compose([input.dom, button.dom, profileBtn.dom])

  const analytics = new CustomComponent('div', {
    class: 'video-analytics hide',
    properties: {},
    template (properties) {
      const keys = Object.keys(properties);
      return `
      <div class="table">
        ${keys.map((key) => {
          const value = properties[key];
          if (['VideoBitrate', 'AudioArrivedPacketRate'].indexOf(key) == -1) {
            return `<div class="cell">
                   ${key}: ${value}
                   </div>`
          } else {
            return `
              <div class="cell">
              ${key}: ${value} kbps
              </div>
            `
          }
         }).join("")}
      </div>`
    }
  })

  const analyticsComponent = analytics;
  profileBtn.on("click", () => {
    analyticsComponent.dom.classList.toggle("hide")
  })
  const container = document.querySelector("#h264-decoder")
  container.appendChild(analyticsComponent.dom)

  info.appendChild(span.dom)
  info.appendChild(row.dom)
  return {
    analyticsComponent
  }
}

window.addEventListener("DOMContentLoaded", (evt) => {  
  
  const sdk = new SDK()

  const {analyticsComponent} = initUI();

  const $decoder = q("#h264-decoder")
  $decoder.addEventListener("dblclick", (evt) => {
    $decoder.classList.toggle('fullscreen')
    q("#canvas-player").classList.toggle('fullscreen')
  })
  sdk.decoder.on("MediaStatistics", (stats) => {
    // console.log("stats", stats);
    analyticsComponent.render(stats)
  })

  const _uid = getUid()
  if (typeof _uid == 'number') {
    sdk.init(_uid).then(() => {
      console.log(`start uid: ${_uid}`)
    })
  }
  
})