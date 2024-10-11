import { EventEmitter } from 'events';

export default class Adapter {
  constructor (url) {
    this.url = url
    this.events = new EventEmitter()
  }

  async connect () {
    WebSocket.binaryType = "arraybuffer"
    this.socket = new WebSocket(`${this.url}`)

    const wsEvents = [
      'open',
      'close',
      'error',
      'message',
    ]

    wsEvents.forEach((event) => {
      this.socket[`on${event}`] = (evt) => {
        this.events.emit(event, evt)
      }
    })
  }

  on(eventName, callback) {
    this.events.on(eventName, callback)
  }

  sendMessage(obj) {
    let msg = typeof obj == "string" ? obj : JSON.stringify(obj)
    this.socket.send(msg)
  }

  emit(eventName, evt) {
    this.events.emit(eventName, evt)
  }
}