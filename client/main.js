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

	var clients = [];
	var tabs = [];
	var logTemplates = {};

	var logDiv;
	var lockCheckbox;
	var tabContainer;
	var statusField;
	var ipField;

	function initTemplates() {
		logTemplates = {
			'system': getTemplate('template_system'),
			'info': getTemplate('template_info'),
			'debug': getTemplate('template_debug'),
			'warn': getTemplate('template_warn'),
			'error': getTemplate('template_error')
		};
	}

	function getTemplate(id) {
		return $('#' + id).text();
	}

	return {
		init: function() {
			logDiv = document.getElementById("logs");
			lockCheckbox = document.getElementById("lock-checkbox");
			tabContainer = document.getElementById("tr-tabs");
			statusField = document.getElementById("field-status");
			ipField = document.getElementById("field-ip");

			// lock the scroll window to the bottom
			window.setInterval(function() {
				if (lockCheckbox.checked) {
					logDiv.scrollTop = logDiv.scrollHeight;
				}
			}, 0)

			initTemplates();

			var socket = io('http://localhost:8080');

			// listen for info events-- these contain server status information
			socket.on(
				'info',
				function (data) {
					console.log("Received info : " + data);

					if (data.status == 0) {
						statusField.innerHTML = "Listening for connections on";
					} else {
						statusField.innerHTML = "Initializing server on";
					}

					ipField.innerHTML = data.ips
						? data.ips.join(", ")
						: "???.???.???";
				});

			// listen for logs
			socket.on(
				'log',
				function (data) {
					var htmlString = replace(
						logTemplates[data.level.toLowerCase()],
						{
							message: data.message,
							timestamp: formatTimestamp(data.timestamp)
						});

					logDiv.appendChild($.parseHTML(htmlString)[0]);
				});

			// listen for clients
			socket.on(
				'addClient',
				function (client) {
					console.log("Added client : " + client.id);

					clients.push(client);

					// create a new tab
					var template = getTemplate('template_tab');
					var htmlString = replace(
						template,
						{
							title: client.name,
							tabTitleId: "tab-title-" + client.id
						});

					var tab = $.parseHTML(htmlString)[0];
					tabs.push(tab);

					tabContainer.appendChild(tab);
				});
			socket.on(
				'updateClient',
				function (client) {
					console.log("Updated client : " + client.id);

					for (var i = 0; i < clients.length; i++) {
						if (clients[i].id == client.id) {
							clients[i] = client;
							break;
						}
					}

					// update name tab
					var div = document.getElementById("tab-title-" + client.id);
					if (div) {
						div.innerHTML = client.title;
					}
				});
			socket.on(
				'removeClient',
				function (client) {
					console.log("Remove client : " + client.id);

					// update tab style
					
				});
		}
	};
})();