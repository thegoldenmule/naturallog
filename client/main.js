function replace(template, params) {
	for (var prop in params) {
		if (params.hasOwnProperty(prop)) {
			template = template.replace(
				new RegExp("\{\{" + prop + "\}\}"),
				params[prop]);
		}
	}

	return template;
}

function formatTimestamp(timestamp) {
	var date = new Date(timestamp);
	var now = new Date();
	
	var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
	var suffix = ( time[0] < 12 ) ? "AM" : "PM";

	// Convert hour from military time
  	time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

	// If hour is 0, set it to 12
  	time[0] = time[0] || 12;

	// If seconds and minutes are less than 10, add a zero
  	for ( var i = 1; i < 3; i++ ) {
	    if ( time[i] < 10 ) {
      	time[i] = "0" + time[i];
    	}
  	}

	// Return the formatted string
  	return time.join(":") + " " + suffix;
}

var Main = (function() {

	var logDiv;
	var lockCheckbox;
	var statusField;
	var ipField;

	function getTemplate(id) {
		return $('#' + id).text();
	}

	return {
		init: function() {
			logDiv = document.getElementById("logs");
			lockCheckbox = document.getElementById("lock-checkbox");
			statusField = document.getElementById("field-status");
			ipField = document.getElementById("field-ip");

			var templates = {
				'system': getTemplate('template_system'),
				'info': getTemplate('template_info'),
				'debug': getTemplate('template_debug'),
				'warn': getTemplate('template_warn'),
				'error': getTemplate('template_error')
			};

			var socket = io('http://localhost:8080');

			socket.on(
				'log',
				function (data) {
					var htmlString = replace(
						templates[data.level.toLowerCase()],
						{
							message: data.message,
							timestamp: formatTimestamp(data.timestamp)
						});

					logDiv.appendChild($.parseHTML(htmlString)[0]);
				});

			socket.on(
				'info',
				function (data) {
					console.log("Received info : " + data);

					if (data.status == 0) {
						statusField.innerHTML = "Listening for connections on";
					} else {
						statusField.innerHTML = "Initializing server on";
					}

					ipField.innerHTML = data.ip;
				});

			// lock the scroll window to the bottom
			window.setInterval(function() {
				if (lockCheckbox.checked) {
					logDiv.scrollTop = logDiv.scrollHeight;
				}
			}, 0)
		}
	};
})();