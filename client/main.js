var socket = io('http://localhost:80');
socket.on('log', function (data) {
	console.log(data);
});