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

	// contains information about log-server
	var logServerInfo = {
		status: -1,
		ips : ["???.???.???"]
	};

	//	client
	//		-> info
	//		-> tab
	//		-> messages
	// 		-> elements
	var clients = [];
	var activeClient = null;
	
	var logTemplates = {};

	var logDiv;
	var lockCheckbox;
	var tabContainer;
	var statusField;
	var ipField;
	var regexField;

	var regex = null;

	function cacheTemplates() {
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

	function isMatch(message) {
		return null === regex || regex.test(message);
	}

	function updateLogServerStatus() {
		if (logServerInfo.status == 0) {
			statusField.innerHTML = "Listening for connections on";
		} else {
			statusField.innerHTML = "Initializing server on";
		}

		ipField.innerHTML = logServerInfo.ips.join(", ");
	}

	function updateVisibility(element, visible) {
		if (!visible) {
			if (!$(element).hasClass('log-hidden')) {
				$(element).addClass('log-hidden');
			}
		} else {
			$(element).removeClass('log-hidden');
		}
	}

	function updateAllVisibilit() {
		if (null != activeClient) {
			var messages = activeClient.messages;
			var elements = activeClient.elements;

			for (var i = 0; i < messages.length; i++) {
				updateVisibility(elements[i], isMatch(messages[i].content));
			}
		}
	}

	function onRegexChanged(event) {
		var value = regexField.value;
		if (0 === value.length) {
			regex = null;
		} else {
			regex = new RegExp(value);
		}

		updateAllVisibility();
	}

	function newTab(info) {
		var template = getTemplate('template_tab');
		var htmlString = replace(
			template,
			{
				title: info.name,
				tabTitleId: "tab-title-" + info.id
			});
		
		var tab = $.parseHTML(htmlString)[0];

		$(tab).mouseup(function (event) {
			Main.selectTab(info.id);
		});

		return tab;
	}

	function newLog(level, message, timestamp) {
		var htmlString = replace(
			logTemplates[level.toLowerCase()],
			{
				message: message,
				timestamp: formatTimestamp(timestamp)
			});

		return $.parseHTML(htmlString)[0];
	}

	function onMessage_info(data) {
		logServerInfo.status = data.status;
		logServerInfo.ips = data.ips;

		updateLogServerStatus();
	}

	function onMessage_log(message) {
		var client = null;
		for (var i = 0; i < clients.length; i++) {
			var element = clients[i];
			if (element.info.id == message.id) {
				client = element;
				break;
			}
		}

		if (null === client) {
			console.log("Log for unknown client : " + message.id);
			return;
		}

		var element = newLog(message.level, message.content, message.timestamp);

		client.elements.push(element);
		client.messages.push(message);

		var visible = isMatch(message.content) && activeClient === client;

		updateVisibility(element, visible);

		if (visible) {
			logDiv.appendChild(element);
		}
	}

	function onMessage_addClient(info) {
		var tab = newTab(info);
		tabContainer.appendChild(tab);

		var client = {
			info : info,
			tab : tab,
			messages : [],
			elements : []
		};

		clients.push(client);

		if (null === activeClient) {
			Main.selectTab(0);
		}
	}

	function onMessage_updateClient(info) {
		var client = null;
		
		for (var i = 0; i < clients.length; i++) {
			var element = clients[i];
			if (element.info.id == info.id) {
				element.info = info;
				client = element;
				break;
			}
		}

		if (null === client) {
			console.log("Update for unknown client : " + info.id);
			return;
		}

		// update name
		client.tab.innerHTML = info.name;
	}

	function onMessage_removeClient(info) {
		console.log("Removed client : " + info.name);

		// update tab style
		
	}

	return {
		init: function() {
			// cache elements
			logDiv = document.getElementById("logs");
			lockCheckbox = document.getElementById("lock-checkbox");
			tabContainer = document.getElementById("tr-tabs");
			statusField = document.getElementById("field-status");
			ipField = document.getElementById("field-ip");
			regexField = document.getElementById("regex-textfield");

			// cache templates
			cacheTemplates();
			
			// watch changes to regex field
			$('#regex-textfield').keyup(onRegexChanged);

			// lock the scroll window to the bottom
			window.setInterval(function() {
				if (lockCheckbox.checked) {
					logDiv.scrollTop = logDiv.scrollHeight;
				}
			}, 0);

			var socket = io('http://localhost:8080');

			// listen for events
			socket.on('info', onMessage_info);
			socket.on('log', onMessage_log);
			socket.on('addClient', onMessage_addClient);
			socket.on('updateClient', onMessage_updateClient);
			socket.on('removeClient', onMessage_removeClient);

			updateLogServerStatus();
		},

		selectTab: function(tabid) {
			for (var i = 0; i < clients.length; i++) {
				var client = clients[i];
				if (client.info.id == tabid) {
					if (client == activeClient) {
						return;
					}

					activeClient = client;

					// unhighlight all tabs
					$('td').removeClass('selected-tab');
					$(activeClient.tab).addClass('selected-tab');

					// remove all logs
					while (logDiv.firstChild) {
						logDiv.removeChild(logDiv.firstChild);
					}

					// add all the new logs
					var elements = activeClient.elements;
					var messages = activeClient.messages;
					for (var j = 0; j < elements.length; j++) {
						var element = elements[j];
						var message = messages[j];

						updateVisibility(element, isMatch(message));
						logDiv.appendChild(element);
					}
				}
			}
		},

		removeTab: function(tabid) {
			
		}
	};
})();