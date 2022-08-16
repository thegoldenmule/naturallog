/**
 * This file controls communication with the log client.
 */

const log = require('electron-log')
const app = require('http').createServer(function handler (req, res) {log.debug("Request : " + req);})
const io = require('socket.io')(app);
const port = 8888;

var logClient = null;
var info =	{
				status: 1,
				ip: ["???.???.???"]
			};

// called when a new connection has been made to the log-client
io.on(
	'connection',
	function (socket) {
		logClient = socket;

		// handle disconnection
		logClient.on(
			'disconnect',
			function() {
				if (logClient == socket) {
					logClient = null;
				}
			});

		// send info to the client
		logClient.emit('info', info);
	});

// listen for incoming socket.io connections
app.listen(port);

/**
 * The interface to the log-client.
 */
var controller = {
	/**
	 * Sets the server info object. This is forwarded to the client either in
	 * this call, or whenever it connects.
	 *
	 * @param      {<type>}  f_info  The server information.
	 */
	setInfo: function(f_info) {
		info = f_info;

		controller.forward('info', info);
	},

	/**
	 * Forwards an event to all connected clients.
	 *
	 * @param      {string}  event    The event
	 * @param      {<type>}  message  The message
	 */
	forward: function(event, message) {
		if (null != logClient) {
			logClient.emit(event, message);
		}
	}
};

/**
 * Expose the controller to other objects.
 */
module.exports = controller;