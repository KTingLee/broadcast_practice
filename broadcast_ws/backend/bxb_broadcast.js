const { RtAudio, RtAudioFormat, RtAudioApi, RtAudioStreamFlags } = require('audify')
const EventEmitter = require('events').EventEmitter
const WebSocket = require('ws')
const dgram = require('dgram')
const util = require('util')

const debug = require('debug')('bxb:broadcast')
const rtAudio = new RtAudio(RtAudioApi.LINUX_ALSA)

const BUFFER_SIZE = 512

rtAudio.openStream(
  {
    deviceId: rtAudio.getDefaultOutputDevice(),
    nChannels: 2,
    firstChannel: 0
  },
  null,
  RtAudioFormat.RTAUDIO_SINT16,
  48000,
  BUFFER_SIZE,
  'MyStream',
  null,
  null,
  (RtAudioStreamFlags.RTAUDIO_SCHEDULE_REALTIME)
)

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
  this.status = 'busy'
  this.clientIp = obj.address
  this.area = obj.area

  // 2. 依照提供的 type 產生對應的 socket
  if (obj.type === 'ws') {
    this.sck = new WebSocket.Server({ port: 8000 })
    this.sck.on('connection', socket => {
      console.log(socket);
      rtAudio.start()
      // 3. 接收資料前再次確認 ip
      socket.on('message', data => {
        console.log(data);
      })
    })
  }
}

util.inherits(Broadcast, EventEmitter)
module.exports = new Broadcast()