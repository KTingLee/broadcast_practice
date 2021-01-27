const corsOption = {
    withCredentials: true,
    extraHeaders: {
    'my-custom-header': 'abcd'
  }
}

// var server_socket = io.connect('http://127.0.0.1:3000', corsOption)
var server_socket = io.connect('http://127.0.0.1:3000')

server_socket.on('second', function (second) {
  console.log(second);
});