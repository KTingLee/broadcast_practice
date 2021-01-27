// const socket = new BinaryClient('ws://localhost:5000');
const broadcast_socket = new WebSocket('ws://localhost:8000');
broadcast_socket.binaryType = 'arraybuffer'
broadcast_socket.onopen = function () {
  console.log(broadcast_socket);
  console.log('connect');
  broadcast_socket.send('打招呼')  // broadcast 使用者送資料
};