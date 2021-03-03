const { RtAudio, RtAudioFormat, RtAudioApi, RtAudioStreamFlags } = require('audify')
const EventEmitter = require('events').EventEmitter
const WebSocket = require('ws')
const util = require('util')

const SimplePeerJs = require('simple-peerjs')
const fetch = require('node-fetch')
const wrtc = require('wrtc')

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
  this.area = []
  this.user = {id: null, ip: ''}

  this.sck = null
  this.peer = null
  this.peerId = ''
}

Broadcast.prototype.init = function () {
  this.status = 'idle'
  this.area = []
  this.user = {id: null, ip: ''} 

  if (this.sck) {
    this.sck.close()
    this.sck = null
  }

  if (this.peer) {
    this.peer.destroy()
    this.peerId = ''
  }
}

Broadcast.prototype.getStatus = function () {
  return {
    status: this.status,
    area: this.area,
    user: this.user.id
  }
}

// 建立與音效卡的連線
Broadcast.prototype.start = async function (bcInfo) {
  debug(`start broadcasting, user: ${bcInfo.user.ip}, area: ${JSON.stringify(bcInfo.area)}`)
  this.status = 'busy'
  this.area = bcInfo.area
  this.user.id = bcInfo.user.id
  this.user.ip = bcInfo.user.ip

  const rtAudioConfig = {
    sampleRate: bcInfo.sampleRate
  }
  _openRtAudio(rtAudioConfig)

  // TODO: 分區參數還沒處理
  if (bcInfo.type === 'ws') {
    this.peer = new SimplePeerJs({wrtc, fetch, WebSocket})
    this.peerId = await this.peer.id
    console.log(`wtrc peer 建立成功，peerId = ${this.peerId}`);

    this.peer.on('connection', client => {
      console.log('有人連到 peer 啦！');
      rtAudio.start()
      client.on('data', data => {
        // if (req.socket.remoteAddress === this.clientIp)
          chunkStream.write(data)
      })
      client.on('close', () => {
        console.log(`peer斷線，將其摧毀`);
        this.destroy()
        console.log(this);
      })
    })
  }
}

Broadcast.prototype.stop = function () {
  if (this.status === 'idle') return

  rtAudio.closeStream()
  console.log(`關閉時的 peer = ${this.peer}`);
  this.init()
  console.log(`關閉後的 peer = ${this.peer}`);

  server.close()
  console.log('停止錄音')
}

function _openRtAudio (cfg) {
  // const output = config.get('sound:output')
  // const outputId = rtAudio.getDevices().findIndex(e => e.name.includes(output))
  rtAudio.openStream(
    {
      deviceId: rtAudio.getDefaultOutputDevice(), //outputId || rtAudio.getDefaultOutputDevice(),
      nChannels: 1,
      firstChannel: 0
    },
    null,
    RtAudioFormat.RTAUDIO_SINT16,
    +cfg.sampleRate || 48000,  // 16000
    +cfg.frameSize || 1024,
    'MyStream',
    null,
    null,
    (RtAudioStreamFlags.RTAUDIO_SCHEDULE_REALTIME)
  )
  
  rtAudio.outputVolume = 1
}

util.inherits(Broadcast, EventEmitter)
module.exports = new Broadcast()