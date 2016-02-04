var express = require('express');

var app = express();

var login = require('facebook-chat-api');

var routes = require('./routes/routes');

var Promise = require('bluebird');

var mongoose = require('bluebird').promisifyAll(require('mongoose'));

var bodyParser = require('body-parser');


mongoose.connect("mongodb://localhost:27017/expedia");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

login({ email: "email", password: "pass"},
	function (err, api){
		if (err) return console.error(err);
		api.listen(function (err, message){
			if(message.body.toLowerCase() === "@expedia"){
				routes.getStatusUpdate(api, message);
			} else if(message.body.includes("$")) {
				console.log('$ included');
				routes.addMoney(api, message);
			}
		});
	});

app.listen(3000);