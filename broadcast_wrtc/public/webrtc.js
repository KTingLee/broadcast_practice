const SimplePeerJs = require('simple-peerjs')

var recording = false
var WebRTC = function (source, cfg) {
  this.peer = new SimplePeerJs({
    secure: true,
  })
  this.peerConnect = ''

  var config = cfg || {};
  var bufferLen = config.bufferLen || 4096;
  this.context = source.context;
  // ScriptProcessor 可以自定義「如何處理聲音訊號」的節點
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);

  // 在 index.html 中，new Recorder 後，其實前端的聲音一直送到 this.node (也就是一直觸發 onaudioprocess)
  this.node.onaudioprocess = (e) => {
    // console.log(e);
    if (!recording) return;
    // mediaRecorder
    console.log(e.inputBuffer.numberOfChannels);  // 看一下傳入 recorder 的 sound 有幾個聲道
    
    const left = e.inputBuffer.getChannelData(1);
    this.peerConnect.peer.send(convertFloat32ToInt16(left))
  }

  function convertFloat32ToInt16(buffer) {
    l = buffer.length;
    buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l])*0x7FFF;
    }
    return buf.buffer;
  }

  source.connect(this.node);  // index.html 中，new Recorder 時，會傳入前端的 sound stream，而該 stream 會與 Recorder 物件連結
  this.node.connect(this.context.destination);    //this should not be necessary
}

WebRTC.prototype.connect = async function (peerId) {
  this.peerConnect = await this.peer.connect(peerId)
  console.log('連結成功？');
  console.log(this.peerConnect);
  console.log(Object.keys(this.peerConnect));
}

WebRTC.prototype.record = function () {
  recording = true
}

WebRTC.prototype.stop = function () {
  recording = false
}

module.exports = WebRTC;