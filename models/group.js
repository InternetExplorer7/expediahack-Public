var mongoose = require('mongoose');

// Create the Schema
var contactSchema = new mongoose.Schema({
		_id: Number, // GroupID
        participants: [{
        	name: String,
        	id: String,
        	money: Number
        }],
        trips: [{
        	type: String
        }]
});

// create the model
module.exports = mongoose.model('groups', contactSchema);