var model = require('../models/group.js');
var extensions = require('./extensions')
var Promise = require('bluebird');
var mongoose = require('bluebird');
var wit = require('node-wit');

exports.getStatusUpdate = function(api, message) { // Builds string to send back.
        Promise.try(function() {
                return model.findById(message.senderID);
        }).then(function(oneModel) {
                if (!oneModel) {
                        var createModel = new model({
                                _id: message.threadID,
                                participants: [],
                                trips: []
                        });
                        createModel.save();
                        api.sendMessage("Hello, I'm an Expedia bot. If everyone tells me how much they can spend, I can find anywhere from fun events happening in your area all the way to hot package deals!", message.senderID)
                } else {
                        api.sendMessage("Hey, just waiting on everybody to give me their budgets so I can build this group the perfect travel plan!", message.senderID);
                }
        });
        // var checkUser = model.findById(message.threadID).exec();

        // checkUser.then(function (oneModel){
        // 	if(!oneModel){ // model was null
        // 		console.log(oneModel + " oneModel");
        // 		var newModel = new Model({
        // 			_id: message.threadID,
        // 			participants: [],
        // 			trips: []
        // 		});
        // 		newModel.save().then(function(product){
        // 			console.log('product: ' + product);
        // 		});
        // 		//api.sendMessage("Hello, I'm an Expedia bot. If everyone gives me how much they are willing to spend, I can find anything from local events to hot package deals!", message.threadID);
        // 	}
        // });
}

exports.addMoney = function(api, message) {
        var money;
        Promise.try(function() {
                return extensions.getDollarAmount(message.body);
        }).then(function(dollarAmount) {
                money = dollarAmount;
                console.log('dollarAmount: ' + dollarAmount);
                return model.findByIdAndUpdate(
                        message.threadID, {
                                $push: {
                                        "participants": {
                                                name: message.senderName,
                                                id: message.senderID,
                                                money: dollarAmount
                                        }
                                }
                        }, {
                                safe: true,
                                upsert: true,
                                new: true
                        });
        }).then(function(oneModel) {
                api.sendMessage("Got it " + message.senderName.split(" ")[0] + ", I have you down for $" + money, message.threadID);
                if(oneModel.participants.length === message.participantNames.length - 1) {
                	api.sendMessage("Okay, that was the last person. Give me a minute while I find the best deals for $" + extensions.getBudget(oneModel), message.threadID);
                	extensions.getTrips(api, message, extensions.getBudget(oneModel));
                } // -1 because bot is included in list
        });
        // Promise.try(function (){
        // 	return model.findByIdAndUpdate(
        // 		message.threadID, {
        // 			$push: {
        // 				"participants": {
        // 					name: message.senderName,
        // 					id: message.senderID,
        // 					money: 454
        // 				}
        // 			}
        // 		}, {
        // 			safe: true,
        // 			upsert: true,
        // 			new: true
        // 		});
        // }).then(function (oneModel){
        // 	console.log('updatedNew: ' + JSON.stringify(oneModel));
        // });
}