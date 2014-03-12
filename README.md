pirateship
==========

Sail in the dark waters of the PirateBay.

Install
==========
```javascript
npm install pirateship
```

How to use
==========
```javascript
var pirateship = require('pirateship');

pirateship.top(pirateship.categories.hdmovies, function(results) {
	console.log(results);
}, function(error) {
	console.error(error);
});
```