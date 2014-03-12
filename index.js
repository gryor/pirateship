var request = require('request');
var url = require('url');
var async = require('async');

function getProxies(success, fail) {
request({url: 'http://proxybay.info/list.txt', timeout: 60000}, function(error, response, body) {
	if (error)
		return fail(error);

	var proxies = body.split('\n\n')[1].split('\n').map(function(e) {
		return url.parse(e);
	});

	proxies.pop();

	var parallel = [];

	proxies.forEach(function(proxy) {
		parallel.push(function(callback) {
			var start = new Date();

			(function(proxy, start) {
				request({url: proxy.protocol + '//' + proxy.host, timeout: 5000}, function(error, response, body) {
					if (error)
						return callback();

					if (body.match('title="Pirate Search"') === null)
						return callback();

					proxy.ping = new Date() - start;
					callback();
				});
			}(proxy, start));
		});
	});

	async.parallel(parallel, function(error) {
		if (error)
			return fail(error);

		proxies = proxies.filter(function(proxy) {
			return ('ping' in proxy);
		});

		proxies.sort(function(a, b) {
			if (a.ping < b.ping) return -1;
			if (a.ping > b.ping) return 1;
			return 0;
		});

		success(proxies);
	});
});
}