var express = require('express');
var path = require('path');
var config = require('./config.json');
var app = express();
app.set('port', config.port);
app.get('/images/offline-pony.png', (_, res) => res.sendFile(path.join(__dirname, 'public', 'images', 'offline-pony.png')));
app.get('/*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'offline.html')));
app.listen(app.get('port'), () => console.log('Listening on port ' + app.get('port')));
