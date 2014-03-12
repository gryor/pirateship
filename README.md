pirateship
==========

Sail in the dark waters of the PirateBay.
Pirateship will automatically select the best proxy or use direct connection if possible.

Install
==========
```javascript
npm install pirateship
```

How to use
==========
```javascript
var pirateship = require('pirateship');

pirateship.top(pirateship.categories.video.hdmovies, function(results) {
    console.log(results);
}, function(error) {
    console.error(error);
});

pirateship.search(pirateship.categories.application.unix, 'ubuntu', function(results) {
    console.log(results);
}, function(error) {
    console.error(error);
});
```