var request = require('request');
var url = require('url');
var async = require('async');
var magnet = require('magnet-uri');

var categories = {
	audio: {
		music: 101,
		audiobooks: 102,
		soundclips: 103,
		flac: 104,
		other: 199
	},
	video: {
		movies: 201,
		moviesdvdr: 202,
		musicvideos: 203,
		movieclips: 204,
		tvshows: 205,
		handheld: 206,
		hdmovies: 207,
		hdtvshows: 208,
		movies3d: 209,
		other: 299
	},
	application: {
		windows: 301,
		mac: 302,
		unix: 303,
		handheld: 304,
		ios: 305,
		android: 306,
		other: 399
	},
	games: {
		pc: 401,
		mac: 402,
		psx: 403,
		xbox360: 404,
		wii: 405,
		handheld: 406,
		ios: 407,
		android: 408,
		other: 499
	},
	porn: {
		movies: 501,
		moviesdvdr: 502,
		pictures: 503,
		games: 504,
		hdmovies: 505,
		movieclips: 506,
		other: 599
	},
	other: {
		ebooks: 601,
		comics: 602,
		pictures: 603,
		covers: 604,
		physibles: 605,
		other: 699
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
				(function(proxy) {
					var start = new Date();
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
				})(proxy);
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
		var data = body.split('detName');
		data.shift();

		data = data.map(function(e) {
			var parsed = {};
			var match = e.match(/href="(magnet:.+?)"/);

			if (match !== null) {
				parsed.magnet = magnet(match[1]);

				if ('dn' in parsed.magnet)
					parsed.magnet.dn = unescape(decodeURI(parsed.magnet.dn).replace(/[\+\.]/g, ' '));
			} else
				return undefined;

			match = e.match(/href="(\/torrent\/.+?)"/);

			if (match !== null)
				parsed.page = match[1];

			return parsed;
		}).filter(function(e) {
			return e !== undefined;
		});

		success(data);
	} else {
		return fail();
	}
}

function top(category, success, fail, tries) {
	fail = fail || perror;
	tries = tries || 1;

	if (tries > 5)
		return fail(new Error('Can not connect to the piratebay.'));

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

function search(category, query, success, fail, tries) {
	fail = fail || perror;
	tries = tries || 1;

	if (tries > 5)
		return fail(new Error('Can not connect to the piratebay.'));

	getBestProxy(function(proxy) {
		request({
			url: proxy.protocol + '//' + proxy.host + '/search/' + query + '/0/7/' + category
		}, function(error, response, body) {
			if (error)
				return fail(error);

			parseResultsPage(body, success, function() {
				search(category, query, success, fail, ++tries);
			});
		});
	}, fail);
}

function addInfo(results, success, fail) {
	fail = fail || perror;

	getBestProxy(function(proxy) {
		var parallel = [];

		results.forEach(function(result) {
			if ('page' in result)
				parallel.push(function(callback) {
					(function(result) {
						request({
							url: proxy.protocol + '//' + proxy.host + result.page
						}, function(error, response, body) {
							if (error)
								return callback(error);

							var match = body.match(/<a href="(http:\/\/www.imdb.com\/title\/.+?\/)"/);

							if(match !== null)
								result.imdburl = url.parse([1]);

							callback();
						});
					})(result);
				});
		});

		async.parallel(parallel, function(error) {
			if (error)
				return fail(error);

			success(results);
		});
	}, fail);
}

exports.categories = categories;
exports.top = top;
exports.search = search;
exports.info = addInfo;