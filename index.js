var request = require('request');
var url = require('url');
var async = require('async');
var magnet = require('magnet-uri');

var categories = {
	"audio": {
		"music": "101",
		"audiobooks": "102",
		"soundclips": "103",
		"flac": "104",
		"other": "199"
	},
	"video": {
		"movies": "201",
		"moviesdvdr": "202",
		"musicvideos": "203",
		"movieclips": "204",
		"tvshows": "205",
		"handheld": "206",
		"hdmovies": "207",
		"hdtvshows": "208",
		"3d": "209",
		"other": "299"
	},
	"application": {
		"windows": "301",
		"mac": "302",
		"unix": "303",
		"handheld": "304",
		"ios": "305",
		"android": "306",
		"other os": "399"
	},
	"games": {
		"pc": "401",
		"mac": "402",
		"psx": "403",
		"xbox360": "404",
		"wii": "405",
		"handheld": "406",
		"ios": "407",
		"android": "408",
		"other": "499"
	},
	"porn": {
		"movies": "501",
		"moviesdvdr": "502",
		"pictures": "503",
		"games": "504",
		"hdmovies": "505",
		"movieclips": "506",
		"other": "599"
	},
	"other": {
		"ebooks": "601",
		"comics": "602",
		"pictures": "603",
		"covers": "604",
		"physibles": "605",
		"other": "699"
	}
};

function perror(err) {
	console.trace(err);
}

function getProxies(success, fail) {
	fail = fail || perror;

	request({
		url: 'http://proxybay.info/list.txt',
		timeout: 60000
	}, function(error, response, body) {
		if (error)
			return fail(error);

		var proxies = [url.parse('http://thepiratebay.se'), url.parse('http://thepiratebay.org')];

		proxies = proxies.concat(body.split('\n\n')[1].split('\n').map(function(e) {
			return url.parse(e);
		}));

		proxies.pop();

		var parallel = [];

		proxies.forEach(function(proxy) {
			parallel.push(function(callback) {
				var start = new Date();

				(function(proxy, start) {
					request({
						url: proxy.protocol + '//' + proxy.host,
						timeout: 2000
					}, function(error, response, body) {
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

var bestProxy = null;

function getBestProxy(success, fail) {
	if (bestProxy)
		success(bestProxy);

	getProxies(function(proxies) {
		bestProxy = proxies[0];
		success(bestProxy);
	}, fail);
}

function parseResultsPage(body, success, fail) {
	if (body.match('<table id="searchResult">') !== null) {
		success(body.match(/href="(magnet:.+?)"/g).map(function(uri) {
			return magnet(uri);
		}).map(function(e) {
			if (e.dn)
				e.dn = unescape(decodeURI(e.dn).replace(/\+/g, ' '));

			return e;
		}));
	} else {
		return fail();
	}
}

function top(category, success, fail, tries) {
	fail = fail ||  perror;
	tries = tries || 1;

	if (tries > 5)
		return fail('Can not connect to the piratebay.');

	getBestProxy(function(proxy) {
		request({
			url: proxy.protocol + '//' + proxy.host + '/top/' + category
		}, function(error, response, body) {
			if (error)
				return fail(error);

			parseResultsPage(body, success, function() {
				top(category, success, fail, ++tries);
			});
		});
	}, fail);
}

exports.categories = categories;
exports.top = top;