const log = require('electron-log')
const app = require('http').createServer(handler)
const io = require('socket.io')(app);
const port = 8080;

var sessions = []

function handler (req, res) {
	log.debug("Request : " + req)
}

io.on('connection', function (socket) {
	log.info("New connection. Sending info packet.");

	socket.emit(
		'info',
		{
			status: 0,
			ip: '127.0.0.1'
		});

	sessions.push(socket);
});

log.info("Listening on port " + port);
app.listen(port);

module.exports = {
	forward : function(event, message) {
		for (var i = 0; i < sessions.length; i++) {
			sessions[i].emit(event, message);
		}
	}
};