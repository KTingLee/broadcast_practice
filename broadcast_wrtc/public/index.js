const WebRTC = require('./webrtc')
var $ = require( "jquery" )

function __log(e, data) {
  const log = document.getElementById('log')
  log.innerHTML += "\n" + e + " " + (data || '')
}

window.onload = function init() {
  console.log('11123132132');
  try {
    // webkit shim。把一些該用的工具準備好
    window.AudioContext = window.AudioContext || window.webkitAudioContext
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
    window.URL = window.URL || window.webkitURL

    audio_context = new AudioContext;
    __log('Audio context set up.')
    __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'))
  } catch (e) {
    alert('No web audio support in this browser!')
  }

  // 詢問使用者是否可使用其媒體設備
  navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => _startUserMedia(stream))
    .catch(err => __log(err))

  function _startUserMedia(stream) {
    var input = audio_context.createMediaStreamSource(stream)  // 利用 createMediaStreamSource 將麥克風音訊轉成音源節點
    __log('Media stream created.')

    // 初始化 MediaRecorder 物件：用來分析聲音節點。初始化時可以提供初始化參數，例如 mimeType, sampleRate
    mediaRecorder = new MediaRecorder(stream)

    // input.connect(audio_context.destination);  // 將 input 傳送到指定位置
    // __log('Input connected to audio context destination.')

    // 初始化 recorder.js 物件，並將音源節點傳入
    webrtc = new WebRTC(input)
    console.log(webrtc);
    __log('Recorder initialised.')
  }
}

