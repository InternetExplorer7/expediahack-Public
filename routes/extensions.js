var model = require('../models/group.js');
var Promise = require('bluebird');
var wit = require('node-wit');
var bhttp = require('bhttp');

exports.getDollarAmount = function(messageBody) {
        return new Promise(function(resolve, reject) {
                wit.captureTextIntent("XINTK3N2UXIKIQWQCZ45GB6V6IE7B353", messageBody, function(err, res) {
                        if (err) reject
                        resolve(res.outcomes[0].entities.amount_of_money[0].value);
                });
        });
}

var getBudget = exports.getBudget = function(oneModel) {
        var buildBudget = 0;
        oneModel.participants.forEach(function(user) {
                buildBudget += user.money;
        });
        return buildBudget;
}

exports.getTrips = function(api, message, budget) {
        var airportsArr = ["San Francisco", "Vancouver", "Ashland", "Las vegas", "los angeles"];
        Promise.try(function() {
                return airportsArr;
        }).map(function(location) {
                console.log('location: ' + JSON.stringify(location))
                return getRegionObject(location);
        }).each(function(locationObject) { // Search for hot travel deals. TODO: each
                // find UnrealDeals
                findUnrealDeals(locationObject, message);
                // find regular packages
                findPackages(locationObject, message);
                return locationObject;
        }).then(function(locationObject) {
                // find local events
                findLocalDeals(api, locationObject, message);
        }).then(function() {
                api.sendMessage("I'm searching for local deals, unreal deals and the best deals on travel packages. One moment.", message.threadID);
                setTimeout(function() { // Screw it, < 2 hrs left :P
                        showListToUser(api, message);
                }, 10000)
        });
}

function showListToUser(api, message) {
        Promise.try(function() {
                return model.findById(message.threadID)
        }).then(function(oneModel) {
                return oneModel.trips
        }).each(function(trip) {
                api.sendMessage(trip, message.threadID);
        });
}

function findLocalDeals(api, locationObj, message) {
        var budget, amountOfPeople
        Promise.try(function() {
                return model.findById(message.threadID)
        }).then(function(oneModel) {
                budget = getBudget(oneModel);
                amountOfPeople = oneModel.participants.length // 2
                return bhttp.get("http://terminal2.expedia.com/x/activities/search?location=Seattle&apikey=a0xuf06qfGQAsRAtxV6uW3vcxXGTQ5qI");
        }).then(function(expediaResponse) {
                // return "Here's a possible local event in Seattle, It's called the EMP Museum. This event will cost each of you $49. Reply YES if you would like to purchase this."
                return expediaResponse.body.activities
        }).map(function(activity) {
                if (activity) {
                        if ((parseInt(activity.fromPrice.substring(1))) * amountOfPeople <= budget) { // within budget
                                return ("Here's a possible local event in Seattle, It's called " + activity.title + ". This event costs " + activity.fromPrice + " per person.");
                        }
                }
        }).filter(function(package) {
                if (package) {
                        return true;
                } else {
                        return false;
                }
        }).each(function(package) {
                return model.findByIdAndUpdate(
                        message.threadID, {
                                $push: {
                                        "trips": package
                                }
                        }, {
                                safe: true,
                                upsert: true,
                                new: true
                        });
        }).then(function(oneModel) {
                console.log("local event saved. " + JSON.stringify(oneModel));
        });
}

function findPackages(locationObj, message) {
        var budget, flightList, hotelList
        var secondLeg = " "
        Promise.try(function() {
                return model.findById(message.threadID);
        }).then(function(oneModel) {
                budget = getBudget(oneModel);
                return bhttp.get("http://terminal2.expedia.com/x/packages?departureDate=2016-02-13&originAirport=SEA&destinationAirport=" + locationObj.a + "&returnDate=2016-02-14&regionid=" + locationObj.id + "&adults=" + oneModel.participants.length + "&limit=4&apikey=a0xuf06qfGQAsRAtxV6uW3vcxXGTQ5qI")
        }).then(function(expediaResponse) {
                flightList = expediaResponse.body.FlightList // obj
                hotelList = expediaResponse.body.HotelList // obj
                if (expediaResponse.body.PackageSearchResultList) {
                        return (expediaResponse.body.PackageSearchResultList.PackageSearchResult)
                }
        }).map(function(package) {
                if (package) {
                        if (parseInt(package.PackagePrice.TotalPrice.Value) <= budget) {
                                console.log('package found');
                                if (Array.isArray(flightList.Flight.FlightItinerary.FlightLeg[1].FlightSegment)) {
                                        secondLeg = flightList.Flight.FlightItinerary.FlightLeg[1].FlightSegment[1].DepartureDateTime
                                } else {
                                        secondLeg = flightList.Flight.FlightItinerary.FlightLeg[1].FlightSegment.DepartureDateTime
                                }
                                //console.log("hotel: " + JSON.stringify(hotelList.Hotel[parseInt(package.HotelReferenceIndex) - 1]));
                                return ("Here's another package, flying from " + (flightList.Flight.FlightItinerary.FlightLeg[0].FlightSegment.DepartureAirportCode) + "  to " + (flightList.Flight.FlightItinerary.FlightLeg[0].FlightSegment.ArrivalAirportCode) + ". All of you would check in on " + (flightList.Flight.FlightItinerary.FlightLeg[0].FlightSegment.DepartureDateTime.substring(0, flightList.Flight.FlightItinerary.FlightLeg[0].FlightSegment.DepartureDateTime.indexOf("T"))) + ". and be checked out by " + secondLeg + " You all would be checking into " + (hotelList.Hotel[parseInt(package.HotelReferenceIndex) - 1].Name) + " from " + hotelList.CheckInDate + " to the " + hotelList.CheckOutDate + ". This hotel is located at " + (hotelList.Hotel[parseInt(package.HotelReferenceIndex) - 1].Location.StreetAddress) + ". This hotel has an average rating of " + (hotelList.Hotel[parseInt(package.HotelReferenceIndex) - 1].StarRating) + ". Here's a description of the hotel: " + (hotelList.Hotel[parseInt(package.HotelReferenceIndex) - 1].Description) + ". The grand total for this trip is " + package.PackagePrice.TotalPrice.Value); // LEFT OFF HERE.
                        }
                }
        }).filter(function(package) {
                if (package) {
                        return true;
                } else {
                        return false;
                }
        }).each(function(package) {
                return model.findByIdAndUpdate(
                        message.threadID, {
                                $push: {
                                        "trips": package
                                }
                        }, {
                                safe: true,
                                upsert: true,
                                new: true
                        });
        }).then(function(oneModel) {
                //onsole.log("packages saved. " + JSON.stringify(oneModel));
        }).catch(function(e) {

        })
}

function findUnrealDeals(locationObj, message) {
        console.log('unrealdeals');
        var budget
        Promise.try(function() {
                return model.findById(message.threadID)
        }).then(function(oneModel) {
                budget = getBudget(oneModel);
                return bhttp.get("http://terminal2.expedia.com/x/deals/packages?originTLA=SEA&destinationTLA=" + locationObj.a + "&startDate=2016-02-01&endDate=2016-04-20&roomCount=1&limit=4&adultCount=" + oneModel.participants.length + "&childCount=0&lengthOfStay=1,2,3,4,5,6,7,8&apikey=a0xuf06qfGQAsRAtxV6uW3vcxXGTQ5qI");
        }).then(function(expediaResponse) {
                //console.log(JSON.stringify(expediaResponse.body.deals.packages));
                return expediaResponse.body.deals.packages
        }).map(function(package) { // ~ 20 packages per city
                if (package.totalPackagePrice <= budget) {
                        return ("UNREAL DEAL: Flight from " + package.originTLA + " to " + package.destinationTLA + ". You all would be checking in at " + package.checkInDate.substring(0, package.checkInDate.indexOf("T")) + " and coming back on " + package.checkOutDate.substring(0, package.checkOutDate.indexOf("T")) + ". Booking with Expedia will save you $" + package.totalPackageSavings + ", bringing this package to a grand total of $" + package.totalPackagePrice);
                }
        }).filter(function(package) {
                if (package) {
                        return true;
                } else {
                        return false;
                }
        }).each(function(package) {
                return model.findByIdAndUpdate(
                        message.threadID, {
                                $push: {
                                        "trips": package
                                }
                        }, {
                                safe: true,
                                upsert: true,
                                new: true
                        });
        }).then(function(oneModel) {
                //console.log("Unreal deals were found and saved. " + JSON.stringify(oneModel));
        }).catch(function(e) {
                console.error(e);
        });
}

// function getHotel(hotelID, callback){
// 	console.log('hotelID passed in : ' + hotelID);
// 		bhttp.get("http://terminal2.expedia.com/x/hotels?hotelids=" + hotelID + "&apikey=a0xuf06qfGQAsRAtxV6uW3vcxXGTQ5qI", {}, function (err, response) {
// 			 callback(response.body)
// 		});
// 	}

function getRegionObject(location) {
        return Promise.try(function() {
                return bhttp.get("http://terminal2.expedia.com/x/suggestions/regions?query=" + location + "&apikey=a0xuf06qfGQAsRAtxV6uW3vcxXGTQ5qI");
        }).then(function(expediaResponse) {
                return expediaResponse.body.sr[0];
        });
}