var WORKER_PATH = './recorderWorker.js';

var Recorder = function(source, cfg){
  var config = cfg || {};
  var bufferLen = config.bufferLen || 4096;
  this.context = source.context;
  // ScriptProcessor 可以自定義「如何處理聲音訊號」的節點
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);
  var worker = new Worker(WORKER_PATH);
  worker.onmessage = function(e){
    var blob = e.data;
    currCallback(blob);
  }

  worker.postMessage({
    command: 'init',
    config: {
      sampleRate: this.context.sampleRate
    }
  });
  var recording = false,
    currCallback;

  // 在 index.html 中，new Recorder 後，其實前端的聲音一直送到 this.node (也就是一直觸發 onaudioprocess)
  this.node.onaudioprocess = function(e){
    // console.log(e);
    if (!recording) return;
    // mediaRecorder
    console.log(e.inputBuffer.numberOfChannels);  // 看一下傳入 recorder 的 sound 有幾個聲道
    
    const left = e.inputBuffer.getChannelData(1);
    broadcast_socket.send(convertFloat32ToInt16(left))
    console.log(convertFloat32ToInt16(left));
    
    // window.Stream.write(convertFloat32ToInt16(left));

    // worker.postMessage({
    //   command: 'record',
    //   buffer: [
    //     e.inputBuffer.getChannelData(0),
    //     e.inputBuffer.getChannelData(0)
    //   ]
    // });
  }


  function convertFloat32ToInt16(buffer) {
    l = buffer.length;
    buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l])*0x7FFF;
    }
    return buf.buffer;
  }
  
  this.configure = function(cfg){
    for (var prop in cfg){
      if (cfg.hasOwnProperty(prop)){
        config[prop] = cfg[prop];
      }
    }
  }

  this.record = function(){
    recording = true;
  }

  this.stop = function(){
    recording = false;
  }

  this.clear = function(){
    worker.postMessage({ command: 'clear' });
  }

  this.getBuffer = function(cb) {
    currCallback = cb || config.callback;
    worker.postMessage({ command: 'getBuffer' })
  }

  this.exportWAV = function(cb, type){
    currCallback = cb || config.callback;
    type = type || config.type || 'audio/wav';
    if (!currCallback) throw new Error('Callback not set');
    worker.postMessage({
      command: 'exportWAV',
      type: type
    });
  }

  source.connect(this.node);  // index.html 中，new Recorder 時，會傳入前端的 sound stream，而該 stream 會與 Recorder 物件連結
  this.node.connect(this.context.destination);    //this should not be necessary
};

Recorder.forceDownload = function(blob, filename){
  var url = (window.URL || window.webkitURL).createObjectURL(blob);
  var link = window.document.createElement('a');
  link.href = url;
  link.download = filename || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
}

  

module.exports = Recorder;
