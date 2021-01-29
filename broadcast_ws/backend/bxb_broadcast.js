const { RtAudio, RtAudioFormat, RtAudioApi, RtAudioStreamFlags } = require('audify')
const EventEmitter = require('events').EventEmitter
const WebSocket = require('ws')
const dgram = require('dgram')
const util = require('util')

// NOTE: 因為丟到底層的 size = buffer * 4，不知道 udp 會收到多長的情況下做一個 Chunk 來切送到底層的資料
const { PassThrough } = require('stream').PassThrough
const Transform = require('stream').Transform
// NOTE: chunk trans stream，用來把進來的資料切塊
function Chunk (size) {
  this.splitSize = size
  this.buffer = Buffer.alloc(0)
  Transform.call(this)
}
util.inherits(Chunk, Transform)

Chunk.prototype._transform = function (chunk, encoding, cb) {
  this.buffer = Buffer.concat([this.buffer, chunk])
  while (this.buffer.length > this.splitSize) {
    let chunk = this.buffer.slice(0, this.splitSize)
    this.push(chunk)
    this.buffer = this.buffer.slice(this.splitSize)
  }
  cb()
}

const debug = require('debug')('bxb:broadcast')
const BUFFER_SIZE = 512
const rtAudio = new RtAudio(RtAudioApi.MACOSX_CORE)
// NOTE: 把 chunk pipe 給 passthrough，passthrough on data 時的資料 size 就會是我們要的 size
const chunkStream = new Chunk(BUFFER_SIZE * 4)
const passStream = new PassThrough()

chunkStream.pipe(passStream)  // 傳來後端的聲音訊號量到達 chunkSize 後，會丟到 passStream（將聲音訊號量統一，這樣 rtAudio 就可以安心分析）
passStream.on('data', data => {  // passStream 就只負責把資料再丟入 rtAudio
  rtAudio.write(data)
})

function Broadcast () {
  this.status = 'idle'
  this.clientIp = ''  // 正在廣播的address
  this.area = []  // 廣播的分區編號
  this.sck = null
}

Broadcast.prototype.getStatus = function () {
  return {
    status: this.status,
    area: this.area
  }
}

// 建立與音效卡的連線
Broadcast.prototype.start = function (obj) {
  debug(`start broadcasting, user: ${obj.address}, area: ${JSON.stringify(obj.area)}`)
  this.status = 'busy'
  this.clientIp = obj.address
  this.area = obj.area
  _openRtAudio()

  if (obj.type === 'ws') {
    this.sck = new WebSocket.Server({ port: 8000 })
    this.sck.on('connection', (socket, req) => {
      rtAudio.start()
      socket.on('message', data => {
        // if (req.socket.remoteAddress === this.clientIp)
          chunkStream.write(data)
      })
    })
  } else if (obj.type === 'udp'){
    this.sck = dgram.createSocket('udp4').bind(8000)
    rtAudio.start()
    this.sck.on('message', (data, req) => {
      // if (`${req.address}:${req.port}` === this.clientIp)
        chunkStream.write(data)
    })
  }
}

Broadcast.prototype.stop = function () {
  rtAudio.closeStream()
  this.status = 'idle'
  this.clientIp = ''
  this.area = []

  this.sck.close()
  this.sck = null
  console.log('停止錄音')
}

function _openRtAudio () {
  rtAudio.openStream(
    {
      deviceId: rtAudio.getDefaultOutputDevice(),  // 由 rtAudio.getDevices() 得到可用的 device
      nChannels: 1,
      firstChannel: 0
    },
    null,
    RtAudioFormat.RTAUDIO_SINT16,
    48000,
    1024,
    'MyStream',
    null,
    null,
    (RtAudioStreamFlags.RTAUDIO_SCHEDULE_REALTIME)
  )
  
  rtAudio.outputVolume = 1
}

util.inherits(Broadcast, EventEmitter)
module.exports = new Broadcast()