const log = require('electron-log')
const app = require('http').createServer(handler)
const io = require('socket.io')(app);
const port = 8080;

var sessions = []
var info =	{
				status: 1,
				ip: ["???.???.???"]
			};

function handler (req, res) {
	log.debug("Request : " + req)
}

io.on('connection', function (socket) {
	log.info("New connection.");

	sessions.push(socket);

	// send info to just this socket
	socket.emit('info', info);
});

log.info("Listening on port " + port);
app.listen(port);

function forward(event, message) {
	log.info("Forward '" + event + "' message to " + sessions.length + " clients.");
	for (var i = 0; i < sessions.length; i++) {
		sessions[i].emit(event, message);
	}
}

module.exports = {
	setInfo: function(f_info) {
		info = f_info;

		forward('info', info);
	},
	forward: forward
};