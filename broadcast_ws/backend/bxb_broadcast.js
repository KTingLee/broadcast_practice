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

rtAudio.openStream(
  {
    deviceId: rtAudio.getDefaultOutputDevice(),
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

  if (obj.type === 'ws') {
    this.sck = new WebSocket.Server({ port: 8000 })
    this.sck.on('connection', (socket, req) => {
      console.log(req.socket.remoteAddress);  // 獲得使用者 ip
      rtAudio.start()
      // 3. 接收資料前再次確認 ip
      socket.on('message', data => {
        chunkStream.write(data)
      })
    })
  } else if (obj.type === 'udp'){
    this.sck = dgram.createSocket('udp4')
    this.sck.bind(8000)
    rtAudio.start()
    this.sck.on('listening', () => {
      this.sck.on('message', data => {
        chunkStream.write(data)
      })
    })
  }
}

Broadcast.prototype.stop = function () {
  this.status = 'idle'
  this.clientIp = ''  // 正在廣播的address
  this.area = []  // 廣播的分區編號

  this.sck.close()
  this.sck = null
}

chunkStream.pipe(passStream)
passStream.on('data', data => {
  rtAudio.write(data)
})


util.inherits(Broadcast, EventEmitter)
module.exports = new Broadcast()