export default class CustomComponent {
  constructor (element, options) {
    this.ele = document.createElement(element)
    for(let property of Object.keys(options)) {
      this[property] = options[property]
    }
    if (this.template && this.template.call) {
      this.render(options.properties)
    }
  }

  set properties(properties) {
    this._properties = properties
  }

  get properties() {
    return this._properties
  }

  set class (_class) {
    this.ele.setAttribute("class", _class)
    this._class = _class
  }

  set content (_content) {
    this.ele.innerHTML = _content
    this._content = _content
  }

  set id(_id) {
    this.ele.setAttribute("id", _id)
    this._id = _id
  }

  get id() {
    return this._id
  }

  set type (_type) {
    this.ele.setAttribute("type", _type)
    this._type = _type
  }

  set name (_name) {
    this.ele.setAttribute("name", _name)
    this._name = _name
  }

  set placeholder (_placeholder) {
    this.ele.setAttribute("placeholder", _placeholder)
    this._placeholder = _placeholder
  }

  get dom () {
    return this.ele;
  }

  on (evtName, cb) {
    this.ele.addEventListener(evtName, cb)
  }

  off (evtName, cb) {
    this.ele.removeEventListener(evtName, cb)
  }

  compose (doms) {
    for (let dom of doms) {
      this.ele.appendChild(dom)
    }
  }

  render (properties) {
    if (this.template && this.template.call) {
      this.properties = properties
      this.dom.innerHTML = this.template(this.properties)
    }
  }
}