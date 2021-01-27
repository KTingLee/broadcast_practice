var server_socket = io.connect();
server_socket.on('second', function (second) {
    console.log(second);
});