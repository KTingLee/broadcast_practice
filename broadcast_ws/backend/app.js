const express = require('express')
const app = express()
const cors = require('cors')
const server = require('http').createServer(app)

const ctrl = require('./broadcast.controller')

// ws 跟 server 聽同一個 port
const ws = require('socket.io')(server, {
  transports: ['websocket', 'polling'],
  pingInterval: 40000,
  pingTimeout: 25000
})

app.use(cors())
app.use(express.static(`${__dirname}/../public`))

app.use((req, res, next) => {
  req.ws = ws
  next()
})

app.get(`/api/broadcast/info`, ctrl.info)
app.get(`/api/broadcast/start`, ctrl.start)
app.get(`/api/broadcast/stop`, ctrl.stop)

server.listen(3000, () => {
  console.log(`後端啟動，port: 3000。接著初始化 ws ...`);
  initWS(ws)
})

function initWS(ws) {
  console.log('init ws');
  ws.on('connection', socket => {
    console.log(`有用戶連線了！`)
    console.log(Object.keys(socket));
    socket.on('message', data => {
      console.log(data);
    })
  })
}