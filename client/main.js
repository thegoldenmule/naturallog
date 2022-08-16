/**
 * Replaces parameters in a template.
 *
 * @param      {string}  template  The template to replace things in.
 * @param      {object}  params    The parameters to replace.
 */
function replace(template, params) {
	for (var prop in params) {
		if (params.hasOwnProperty(prop)) {
			template = template.replace(
				new RegExp(
					"\{\{" + prop + "\}\}",
					"g"),
				params[prop]);
		}
	}

	return template;
}

/**
 * Nicely formats a timestamp for logging.
 *
 * @param      {long}    timestamp  The timestamp
 */
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

// Swiped from "http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript".
var ClipboardController = {
	/**
	 * Copies a block of text to the clipboard.
	 *
	 * @param      {<type>}   text    The text to copy.
	 * @return     {boolean}  True if successful.
	 */
	copy: function(text) {
		var textArea = document.createElement("textarea");
		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;
		textArea.style.width = '2em';
		textArea.style.height = '2em';
		textArea.style.padding = 0;
		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';
		textArea.style.background = 'transparent';
		textArea.value = text;

		document.body.appendChild(textArea);

		textArea.select();

		var success;
		try {
			success = document.execCommand('copy');
		} catch (err) {
			success = false;
		}

		document.body.removeChild(textArea);

		return success;
	}
};

var InputController = (function() {

	var combos = [];
	var keyStack = [];

	function execute() {
		//console.log("Execute " + "(" + keyStack.join(", ") + ")");
		for (var i = 0; i < combos.length; i++) {
			var combo = combos[i];
			var keys = combo.keys;

			var valid = true;
			for (var j = 0; j < keys.length; j++) {
				if (keyStack.length > j) {
					if (keyStack[j] != keys[j]) {
						valid = false;
						break;
					}
				} else {
					valid = false;
					break;
				}
			}

			if (valid) {
				combo.callback();
				break;
			}
		}
	}

	return {
		register: function(keys, callback) {
			combos.push({
				keys		:keys,
				callback	:callback
			});

			return this;
		},
		init: function() {
			$(document).keydown(function(event) {
				var value = event.keyCode;

				// skip alts + windows key!
				if (18 === value || 91 === value) {
					return;
				}

				if (-1 === keyStack.indexOf(value)) {
					keyStack.push(value);

					execute();
				}
			});

			$(document).keyup(function(event) {
				var value = event.keyCode;

				// skip alts + windows key!
				if (18 === value || 91 === value) {
					return;
				}

				var index = keyStack.indexOf(value);
				keyStack.splice(index, 1);
			});
		}
	};
})();

var FileController = (function() {


	return {
		save: function() {
			console.log('FileController.Save');
		},
		open: function() {
			console.log('FileController.Open');
		}
	};
})();

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
	var numMatches = 0;
	
	var logTemplates = {};

	var logDiv;
	var lockCheckbox;
	var tabContainer;
	var statusField;
	var ipField;
	var regexField;
	var matchesField;
	var statusbarField;

	var filterInfo;
	var filterDebug;
	var filterWarn;
	var filterError;
	var filters;

	var elementIds = 0;

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

	function statusbar(content) {
		statusbarField.innerHTML = formatTimestamp(Date.now()) + " " + content;
	}

	function getTemplate(id) {
		return $('#' + id).text();
	}

	function isVisible(message) {
		return (null === regex || regex.test(message.content))
			&& filters[message.level];
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

	function updateMatches() {
		matchesField.innerHTML = numMatches + " matches.";
	}

	function updateAllVisibility() {
		numMatches = 0;

		if (null != activeClient) {
			var messages = activeClient.messages;
			var elements = activeClient.elements;

			for (var i = 0; i < messages.length; i++) {
				var message = messages[i];
				var match = isVisible(message);

				updateVisibility(elements[i], match);

				if (match) {
					numMatches++;
				}
			}
		}

		updateMatches();
	}

	function newTab(info) {
		var template = getTemplate('template_tab');
		var htmlString = replace(
			template,
			{
				title: info.name,
				tabId: info.id
			});
		
		return $.parseHTML(htmlString)[0];
	}

	function newLog(level, message, timestamp) {
		const id = elementIds++;
		const htmlString = replace(
			logTemplates[level.toLowerCase()],
			{
				message: message,
				timestamp: formatTimestamp(timestamp),
				id,
			});

		const elements = $.parseHTML(htmlString)[0];

		$(`element-ts-${id}`).click(() => {
			$(`element-ms-${id}`).toggleClass('log-hidden');
		});

		return elements;
	}

	function rebuildFilters() {
		filters = {
			'info' : filterInfo.checked,
			'debug' : filterDebug.checked,
			'warn' : filterWarn.checked,
			'error' : filterError.checked
		};

		updateAllVisibility();
	}

	function shiftTabs(direction) {
		if (null === activeClient) {
			return;
		}

		for (var i = 0; i < clients.length; i++) {
			var client = clients[i];
			if (client === activeClient) {
				var index = i + direction;
				if (index != i
					&& index >= 0
					&& index < clients.length) {
					Main.selectTab(clients[index].info.id);
				}
			}
		}
	}

	function gatherAllLogs() {
		if (null === activeClient) {
			return;
		}

		var messages = [];
		for (var i = 0; i < activeClient.messages.length; i++) {
			messages.push(activeClient.messages[i].content);
		}

		return messages.join("\n");
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

	function onMessage_info(data) {
		logServerInfo.status = data.status;
		logServerInfo.ips = data.ips;

		updateLogServerStatus();
	}

	function onMessage_log(message) {
		// cleanup
		message.level = message.level.toLowerCase();

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

		var visible = activeClient === client && isVisible(message);

		updateVisibility(element, visible);

		if (visible) {
			numMatches++;
			updateMatches();
		}

		if (visible) {
			logDiv.appendChild(element);
		}
	}

	function onMessage_addClient(info) {
		statusbar("New client connected.");

		var tab = newTab(info);
		tabContainer.appendChild(tab);

		var client = {
			info : info,
			tab : tab,
			tabTitle: document.getElementById("tab-" + info.id + "-title"),
			tabClose: document.getElementById("tab-" + info.id + "-close"),
			messages : [],
			elements : [],
			isConnected: true
		};

		clients.push(client);

		$(client.tabTitle).mouseup(function (event) {
			Main.selectTab(info.id);
		});

		$(client.tabClose).mouseup(function (event) {
			Main.removeTab(info.id);
		});

		if (null === activeClient) {
			Main.selectTab(client.info.id);
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
			console.warn("Update for unknown client : " + info.id);
			return;
		}

		// update name
		client.tabTitle.innerHTML = info.name;
	}

	function onMessage_removeClient(info) {
		statusbar("Client disconnected : " + info.name);

		var client = null;
		
		for (var i = 0; i < clients.length; i++) {
			var element = clients[i];
			if (element.info.id == info.id) {
				element.info = info;
				element.isConnected = false;

				client = element;
				break;
			}
		}

		if (null === client) {
			console.warn("Remove for unknown client : " + info.id);
			return;
		}

		$(client.tabClose).removeClass('hidden');
		$(client.tab).addClass('dead-tab');
	}

	function onMessage_fileMenu(menuOption) {
		var type = menuOption.type;
		if ('clear' === type) {
			Main.clearTab();
		} else if ('copy' === type) {
			Main.copyTab();
		} else if ('switchtabs' === type) {
			shiftTabs(menuOption.value);
		} else if ('tablayout' === type) {

		} else if ('addtab' === type) {

		} else if ('gettab' === type) {

		}
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
			matchesField = document.getElementById("matches");
			filterInfo = document.getElementById("checkbox-info");
			filterDebug = document.getElementById("checkbox-debug");
			filterWarn = document.getElementById("checkbox-warn");
			filterError = document.getElementById("checkbox-error");
			statusbarField = document.getElementById("statusbar");

			// cache templates
			cacheTemplates();
			
			// watch changes to regex field
			$('#regex-textfield').keyup(onRegexChanged);

			// watch log level toggles
			$('#checkbox-info').change(rebuildFilters);
			$('#checkbox-debug').change(rebuildFilters);
			$('#checkbox-warn').change(rebuildFilters);
			$('#checkbox-error').change(rebuildFilters);
			rebuildFilters();

			// lock the scroll window to the bottom
			window.setInterval(function() {
				if (lockCheckbox.checked) {
					logDiv.scrollTop = logDiv.scrollHeight;
				}
			}, 0);

			var socket = io('http://localhost:8888');

			// listen for events
			socket.on('info', onMessage_info);
			socket.on('log', onMessage_log);
			socket.on('addClient', onMessage_addClient);
			socket.on('updateClient', onMessage_updateClient);
			socket.on('removeClient', onMessage_removeClient);
			socket.on('filemenu', onMessage_fileMenu)

			updateLogServerStatus();

			// register combos
			InputController
				// ctrl + tab
				.register([17, 9], function() { shiftTabs(1); })
				// ctrl + shift + tab
				.register([17, 16, 9], function() { shiftTabs(-1); })
				// ctrl + s
				.register([17, 83], FileController.save)
				// ctrl + o
				.register([17, 79], FileController.open)
				// ctrl + delete
				.register([17, 46], Main.clearTab)
				// ctrl + shift + c
				.register([17, 16, 67], Main.copyTab)
				.init();

			statusbar("Ready.");
		},

		copyTab: function() {
			if (ClipboardController.copy(gatherAllLogs())) {
				statusbar("Copied.");
			} else {
				statusbar("Could not copy.");
			}
		},

		clearTab: function () {
			if (null !== activeClient) {
				if (activeClient.isConnected) {
					for (var i = 0, len = activeClient.elements.length; i < len; i++) {
						var node = activeClient.elements[i];
						if (node.parentNode) {
							node.parentNode.removeChild(node);
						}
					}
					activeClient.elements = [];
					activeClient.messages = [];
				} else {
					Main.removeTab(activeClient.info.id);
				}
			}
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

					// update visibility of all logs
					updateAllVisibility();

					// add all the logs
					var elements = activeClient.elements;
					for (var j = 0; j < elements.length; j++) {
						logDiv.appendChild(elements[j]);
					}
				}
			}
		},

		removeTab: function(tabid) {
			for (var i = 0; i < clients.length; i++) {
				var client = clients[i];
				if (client.info.id == tabid) {
					// remove client + tab
					clients.splice(i, 1);
					tabContainer.removeChild(client.tab);

					// try to select another tab
					if (i < clients.length) {
						Main.selectTab(clients[i].info.id);
					}
					else if (i > 0) {
						Main.selectTab(clients[i - 1].info.id);
					}
					else {
						// couldn't select something else
						while (logDiv.firstChild) {
							logDiv.removeChild(logDiv.firstChild);
						}

						matches = 0;
						updateMatches();

						activeClient = null;
					}

					break;
				}
			}
		}
	};
})();