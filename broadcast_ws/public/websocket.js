var socket = io.connect();
socket.on('second', function (second) {
    console.log(second);
});