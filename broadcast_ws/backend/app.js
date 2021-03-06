const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const server = require('http').createServer(app)

const ctrl = require('./broadcast.controller')

const corsOption = {
  origin: ['http://127.0.0.1:3000', 'http://127.0.0.1:5000', 'http://127.0.0.1:8887'],
  methods: ['GET', 'POST'],
  credentials: true
}

// ws 跟 server 聽同一個 port
const ws = require('socket.io')(server, {
  transports: ['websocket', 'polling'],
  pingInterval: 40000,
  pingTimeout: 25000,
  cors: corsOption
})

app.use(cors())
app.use(express.static(`${__dirname}/../public`))
app.use(bodyParser.json({limit: 1024 * 1024 * 1024})) // 1G
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  req.ws = ws
  next()
})

app.get(`/api/broadcast/info`, ctrl.info)
app.post(`/api/broadcast/start`, ctrl.start)
app.get(`/api/broadcast/stop`, ctrl.stop)

server.listen(3000, () => {
  console.log(`後端啟動，port: 3000。接著初始化 ws ...`);
  initWS(ws)
})

function initWS(ws) {
  console.log('初始化ws，等待用戶連線...');
  
  // setInterval(() => {
  //   ws.emit('second', { 'second': new Date().getSeconds()})
  // }, 1000)

  ws.on('connection', socket => {
    console.log(`有用戶連線了！`)
    console.log(Object.keys(socket));
    console.log(socket.handshake.address);  // 獲得該使用者的 address
    socket.on('message', data => {
      console.log(data);
    })
  })
}