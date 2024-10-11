import YUVCanvas from './yuv-canvas'
import DecoderConsole from './log'

const nowValue = Decoder.nowValue

export default class Player {
  constructor (options) {
    this._options = options || {};
    
    this.render = true;
    if (this._options.render === false){
      this.render = false;
    };
        
    this._options.workerFile = this._options.workerFile || "Decoder.js";
    if (this._options.preserveDrawingBuffer){
      this._options.contextOptions = this._options.contextOptions || {};
      this._options.contextOptions.preserveDrawingBuffer = true;
    };

    let webgl = false;
    // use auto when pass null or undefined
    if (this._options.webgl == 'auto' || this._options.webgl === null || this._options.webgl === undefined) {
      let webglMode = "auto"
      DecoderConsole.log("using webgl auto");
      if (webglMode == "auto") {
        webgl = true;
        try{
          if (!window.WebGLRenderingContext) {
            // the browser doesn't even know what WebGL is
            webgl = false;
          } else {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext("webgl");
            if (!ctx) {
              // browser supports WebGL but initialization failed.
              webgl = false;
            };
          };
        } catch (e) {
          webgl = false;
        };
      };
    } else {
      // set webgl switch
      DecoderConsole.log("using webgl manual");
      if (this._options.webgl === true) {
        webgl = true;
      } else if (this._options.webgl === false) {
        webgl = false;
      };
    }

    this.webgl = webgl;
    
    // choose functions
    if (this.webgl) {
      this.createCanvasObj = this.createCanvasWebGL;
      this.renderFrame = this.renderFrameWebGL;
      DecoderConsole.log("using webgl render");
    } else {
      this.createCanvasObj = this.createCanvasRGB;
      this.renderFrame = this.renderFrameRGB;
      DecoderConsole.log("using canvas render");
    };
    
    
    let lastWidth;
    let lastHeight;
    const onPictureDecoded = (buffer, width, height, infos) => {
      this.onPictureDecoded(buffer, width, height, infos);
      
      let startTime = nowValue();
      
      if (!buffer || !this.render) {
        return;
      };
      
      this.renderFrame({
        canvasObj: this.canvasObj,
        data: buffer,
        width: width,
        height: height
      });
      
      if (this.onFrameRenderCompleted){
        this.onFrameRenderCompleted(nowValue() - startTime)
      };
      
    };
    
    // provide size
    
    if (!this._options.size){
      this._options.size = {};
    };
    this._options.size.width = this._options.size.width || 640;
    this._options.size.height = this._options.size.height || 480;
    
    if (this._options.useWorker){
      const worker = new Worker(this._options.workerFile);
      this.worker = worker;
      worker.addEventListener('message', (e) => {
        const data = e.data;
        if (data.consoleLog){
          console.log(data.consoleLog);
          return;
        };
        onPictureDecoded(new Uint8Array(data.buf, 0, data.length), data.width, data.height, data.infos);
      }, false);
      
      worker.postMessage({type: "Broadway.js - Worker init", options: {
        rgb: !this.webgl,
        memsize: this.memsize,
        reuseMemory: this._options.reuseMemory ? true : false
      }});
      
      if (this._options.transferMemory){
        this.decode = function(parData, parInfo){
          // no copy
          // instead we are transfering the ownership of the buffer
          // dangerous!!!
          const startTime = nowValue()
          worker.postMessage({buf: parData.buffer, offset: parData.byteOffset, length: parData.length, info: parInfo}, [parData.buffer]); // Send data to our worker.
          if (this.onFrameDecodeCompleted) {
            this.onFrameDecodeCompleted(nowValue() - startTime)
          }
        };
        
      } else {
        this.decode = function(parData, parInfo){
          // Copy the sample so that we only do a structured clone of the
          // region of interest
          const startTime = nowValue()
          var copyU8 = new Uint8Array(parData.length);
          copyU8.set( parData, 0, parData.length );
          worker.postMessage({buf: copyU8.buffer, offset: 0, length: parData.length, info: parInfo}, [copyU8.buffer]); // Send data to our worker.
          if (this.onFrameDecodeCompleted) {
            this.onFrameDecodeCompleted(nowValue() - startTime)
          }
        };
      };
      
      if (this._options.reuseMemory) {
        this.recycleMemory = function(parArray){
          //this.beforeRecycle();
          worker.postMessage({reuse: parArray.buffer}, [parArray.buffer]); // Send data to our worker.
          //this.afterRecycle();
        };
      }
    } else {
      
      this.decoder = new Decoder({
        rgb: !this.webgl
      });
      this.decoder.onPictureDecoded = onPictureDecoded;

      this.decode = (parData, parInfo) => {
        const startTime = nowValue()
        this.decoder.decode(parData, parInfo)
        if (this.onFrameDecodeCompleted) {
          this.onFrameDecodeCompleted(nowValue() - startTime)
        }
      };
      
    };
    
    
    
    this.canvasObj = this.createCanvasObj({
      contextOptions: this._options.contextOptions
    });

    this.canvas = this.canvasObj.canvas;

    this.domNode = this.canvas;
    
    lastWidth = this._options.size.width;
    lastHeight = this._options.size.height;
  }

  onPictureDecoded (buffer, width, height, infos) {}

  recycleMemory (buf) {}

  createCanvasWebGL (options) {
    const canvasObj = this._createBasicCanvasObj(options)
    canvasObj.contextOptions = options.contextOptions
    return canvasObj
  }

  createCanvasRGB (options) {
    const canvasObj = this._createBasicCanvasObj(options)
    return canvasObj
  }

  _createBasicCanvasObj (options) {
    options = options || {}
    const obj = {}
    let width = this._options.size.width
    let height = this._options.size.height
    obj.canvas = document.createElement("canvas")
    obj.canvas.width = width
    obj.canvas.height = height
    obj.canvas.style.backgroundColor = "#000000"
    obj.canvas.setAttribute("id", this._options.id)

    return obj
  }

  renderFrameWebGL (options) {
    const canvasObj = options.canvasObj

    const width = options.width || canvasObj.canvas.width
    const height = options.height || canvasObj.canvas.height
    
    if (this._options.size.width !== canvasObj.width || this._options.size.height !== canvasObj.height || !canvasObj.webGLCanvas) {
      canvasObj.canvas.width = this._options.size.width;
      canvasObj.canvas.height = this._options.size.height;
      canvasObj.webGLCanvas = new YUVCanvas({
        canvas: canvasObj.canvas,
        contextOptions: canvasObj.contextOptions,
        width: width,
        height: height
      });
    }
    const ylen = width * height;
    const uvlen = (width / 2) * (height / 2);
      
    canvasObj.webGLCanvas.drawNextOutputPicture({
      yData: options.data.subarray(0, ylen),
      uData: options.data.subarray(ylen, ylen + uvlen),
      vData: options.data.subarray(ylen + uvlen, ylen + uvlen + uvlen)
    });
    this.recycleMemory(options.data);
  }

  renderFrameRGB (options) {
    const canvasObj = options.canvasObj;

    const width = options.width || canvasObj.canvas.width;
    const height = options.height || canvasObj.canvas.height;
    
    let ctx = canvasObj.ctx;
    let imgData = canvasObj.imgData;

    if (this._options.size.width !== canvasObj.width || this._options.size.height !== canvasObj.height) {
      canvasObj.width = this._options.size.width;
      canvasObj.height = this._options.size.height;
    }

    if (!ctx){
      canvasObj.ctx = canvasObj.canvas.getContext('2d');
      ctx = canvasObj.ctx;

      canvasObj.imgData = ctx.createImageData(width, height);
      imgData = canvasObj.imgData;
    };

    imgData.data.set(options.data);
    ctx.putImageData(imgData, 0, 0);
    this.recycleMemory(options.data);
  }

  resize(width, height) {
    this._options.size.width = width;
    this._options.size.height = height;
  }

}