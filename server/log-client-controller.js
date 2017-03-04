/**
 * This file controls communication with the log client.
 */

const log = require('electron-log')
const app = require('http').createServer(function handler (req, res) {log.debug("Request : " + req);})
const io = require('socket.io')(app);
const port = 8080;

var logClient = null;
var info =	{
				status: 1,
				ip: ["???.???.???"]
			};

// called when a new connection has been made to the log-client
io.on('connection', function (socket) {
	log.info("New log-client connection.");

	// handle disconnection
	socket.on('disconnect', function() {
		log.info("Log-client disconnection.");

		if (logClient == socket) {
			logClient = null;
		}
	});

	logClient = socket;

	// send info to the client
	logClient.emit('info', info);
});

app.listen(port);

/**
 * Forwards an event to all connected clients.
 *
 * @param      {string}  event    The event
 * @param      {<type>}  message  The message
 */
function forward(event, message) {
	if (null != logClient) {
		logClient.emit(event, message);
	}
}

// exported object
module.exports = {
	/**
	 * Sets info on the 
	 *
	 * @param      {<type>}  f_info  The f information
	 */
	setInfo: function(f_info) {
		info = f_info;

		forward('info', info);
	},
	forward: forward
};