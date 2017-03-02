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

var Main = (function() {

	return {
		init: function() {
			var logDiv = document.getElementById("logs");

			function getTemplate(id) {
				return $('#' + id).text();
			}

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
							timestamp: data.timestamp
						});

					logDiv.appendChild($.parseHTML(htmlString)[0]);
				});
		}
	};
})();