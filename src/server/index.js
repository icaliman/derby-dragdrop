var express = require('express');
var derby = require('derby');
var coffeeify = require('coffeeify');
var racerBrowserChannel = require('racer-browserchannel');
var liveDbMongo = require('livedb-mongo');
var app = require('../todos');
var serverError = require('./serverError');
var MongoStore = require('connect-mongo')(express);

console.log(1111111);

var expressApp = module.exports = express();

if (process.env.REDIS_HOST) {
    var redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    redis.auth(process.env.REDIS_PASSWORD);
} else if (process.env.OPENREDIS_URL) {
    var redisUrl = require('url').parse(process.env.OPENREDIS_URL);
    var redis = require('redis').createClient(redisUrl.port, redisUrl.hostname);
    redis.auth(redisUrl.auth.split(":")[1]);
} else {
    var redis = require('redis').createClient();
}
redis.select(6);

var mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/derby-sortable';
// The store creates models and syncs data
var store = derby.createStore({
    db: {
        db: liveDbMongo(mongoUrl + '?auto_reconnect', {safe: true}),
        redis: redis
    }
});

publicDir = require('path').join(__dirname + '/../../public');

store.on('bundle', function (browserify) {
    browserify.add(publicDir + '/jquery-1.9.1.min.js');
    browserify.add(publicDir + '/jquery-ui.js');
    browserify.transform(coffeeify);
});

ONE_YEAR = 1000 * 60 * 60 * 24 * 365

sessionStore = new MongoStore({
    url: mongoUrl,
    auto_reconnect: true,
    safe: true
}, function(mongoStore, err) {
    if (err) {
        return console.log("Error on connecting to Mongo: ", err);
    }

    expressApp
        .use(express.favicon())
        .use(express.compress())

        .use(app.scripts(store))

        .use(racerBrowserChannel(store))

        .use(store.modelMiddleware())

        .use(express.cookieParser())
        .use(express.session({
            secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE',
            store: sessionStore
        }))

        .use(app.router())
        .use(expressApp.router)
        .use(serverError());

    expressApp.all('*', function (req, res, next) {
        next('404: ' + req.url);
    });

});
