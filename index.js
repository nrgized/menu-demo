var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var zones = [];
var userOptions = [];
var userVars = {};

app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));
app.set('verify_token', (process.env.VERIFY_TOKEN || 'TEST'));
app.set('page_access_token', (process.env.PAGE_ACCESS_TOKEN || 'NULL'));
 
app.get('/', function (req, res) {
        res.send('It Works! Follow FB Instructions to activate.');
});
 
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === app.get('verify_token')) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});
  
app.post('/webhook/', function (req, res) {
   // console.log (req.body);
    messaging_events = req.body.entry[0].messaging;
   // console.log(messaging_events);
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;
    //    userOptions[sender] = {id: sender, test: "tests"}
    //    console.log(userOptions[sender]);
        var UserLat;
        var UserLng;
        var UserLocation;
       
// check if received message is postback
        if (event.postback && event.postback.payload) {

          // check for postback cases


          if (event.postback.payload === 'select') {
            console.log('select');

                  var messageData = {
                    "recipient":{
                      "id": sender
                    },
                    "message":{
                      "text":"Pasirink automobilio tipa",
                      "quick_replies":[
                        {
                          "content_type":"text",
                          "title":"Praktiški",
                          "payload":"selectpractical"
                        },
                        {
                          "content_type":"text",
                          "title":"Komfortiški",
                          "payload":"selectcomfort"
                        },     
                        {
                          "content_type":"text",
                          "title":"Krovininiai",
                          "payload":"selectcargo"
                        },
                        {
                          "content_type":"text",
                          "title":"Rinktiniai",
                          "payload":"selectpremium"
                        }
                      ]
                    }
                  }; 
                  callSendAPI(messageData);

          }

          if (event.postback.payload === 'search') {
            console.log('search');
              askLocation();
          }

        }
// handle attachment


        if (event.message && event.message.attachments) {   
          var att = event.message.attachments;

          // check if attachemtn is array

          if(Array.isArray(att)){
            if (att[0].type === "location") {
              UserLat = event.message.attachments[0].payload.coordinates.lat;
              UserLng = event.message.attachments[0].payload.coordinates.long;
              sendTextMessage(sender, "Ačiū. Ieškau artimiausios maitinimo įstaigos");
              console.log(UserLat);
              console.log(UserLng);
              getClosestLocation(UserLat, UserLng)
            }
            if (att[0].type === "image") {
              console.log("image");
            }
          }
          else {
            console.log("attachment is not array")
          }
        }  
       

// end of location check

        if (event.message && event.message.text) {
            text = event.message.text;
            text = text.toLowerCase();
            if (text === 'thread') {
                changeThreadSettings();
            continue
            }
            if (text === 'check') {
                getHTTPinfo(sender);
            continue
            }
    
            if (text.charAt(0) == '#') {
                console.log("groteles");
                var matches = [];
                // check for matching zones
                var value = text.substring(1, 200);
                
                
                for (i = 0; i < zones.length; i++) {
                  if (zones[i].nameEN.indexOf(value) > 0)
                  { 
                    var match = {};
                    match.id = zones[i].id;
                    match.nameFull = zones[i].nameFull;
                    match.nameEN = zones[i].nameEN;
                    match.nameLT = zones[i].nameLT;
                    matches.push(match);

                  } 
                }
                console.log(matches.length);
                // action depending on amount of matching zones
                if (matches.length <= 0) {
                  sendTextMessage(sender, "stoteles tokiu pavadinimu nera ");
                }
                else if (matches.length === 1) {
                  getHTTPinfo(sender, matches[0].id);
                }
                else if (matches.length < 6) {
                 // sendTextMessage(sender, "pasirinkite is zemiau esanciu stoteliu");
                  var buttons = [
                      {
                        "type":"web_url",
                        "url":"https://petersapparel.parseapp.com",
                        "title":"Show Website"
                      },
                      {
                        "type":"postback",
                        "title":"Start Chatting",
                        "payload":"USER_DEFINED_PAYLOAD"
                      }
                    ];
               //var button = {};
               //for (i = 0; i < matches.length; i++) {
                    var button = {
                        "type":"web_url",
                        "url":"https://petersapparel.parseapp.com",
                        "title":"Show Website"
                    }
                    buttons.push(button);
               //};
                  var messageData = {
                    "recipient":{
                      "id": sender
                    },
                    "message":{
                      "attachment":{
                        "type":"template",
                        "payload":{
                          "template_type":"button",
                          "text":"What do you want to do next?",
                          "buttons": buttons
                        }
                      }
                    }
                  }; 
                  callSendAPI(messageData);
                  sendTextMessage(sender, "st" + buttons.length);
                  sendTextMessage(sender, "st" + buttons[0].type);
                }
                else {
                  sendTextMessage(sender, "stoteliu rast per daug. patisklinkite paieska");
                }
            continue
            }
            if (text === 'bee') {
                console.log('bee');
                getStopsData();
            continue
            }
            if (text === 'zones') {
                console.log('zones');
                console.log(zones);
            continue
            }
            if (text.charAt(0) === '@') {
                var value = text.substring(1, 200);
                console.log("@@@@@");
                sendTextMessage(sender, "stotele " + value);
                getHTTPinfo(sender, value);
            continue
            }

           
            // Your Logic Replaces the following Line
            sendTextMessage(sender, "Text received 123456, echo: "+ text.substring(0, 200));
        }
    }
    res.sendStatus(200);
});

// function to send GET request and parse stop names
function getStopsData() {
  var url = 'https://login.citybee.lt/lt/';
  request({
    headers: {
      'Cookie': 'PHPSESSID=8m3an6jv3vtmurj9pv1u9a0od3; device_view=full; BCSI-CS-97976de0be87e764=2; BIGipServerglosC-proxyVIP-bc-RBB-web_gdcsfscs05-55_8050_pool=3242406179.29215.0000; _ga=GA1.2.500491733.1468570414; BCSI-CS-b933f65a4f518259=2; BIGipServerSlough-proxyVIP-bc-RBB-web-SLGSFSCS105-155_8050_pool=3778638102.29215.0000; __utmt=1; __utma=269912044.500491733.1468570414.1468570425.1468587689.2; __utmb=269912044.4.10.1468587689; __utmc=269912044; __utmz=269912044.1468587689.2.2.utmcsr=citybee.lt|utmccn=(referral)|utmcmd=referral|utmcct=/lt/'
    },
    uri: url,
    method: "POST",
    timeout: 10000,
    followRedirect: true,
    maxRedirects: 10
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // acction on HTTP request success

      console.log('http success');

      // parse html
      var cheerio = require('cheerio'),
      $ = cheerio.load(body);
        var script = $('script:contains("var opts")').html();
        
        script = script.substring(script.indexOf("var opts = {") + 11);
        script = script.substring(0, script.indexOf(";"));
        var carlocationsString = script.substring(script.indexOf("carslocations: [") + 14);
        carlocationsString = carlocationsString.substring(0, carlocationsString.indexOf("bicycleZonesLocations"));
        carlocationsString = carlocationsString.substring(0, carlocationsString.lastIndexOf(","));
        var carlocations = JSON.parse(carlocationsString);
       //console.log(carlocations[300].lat); 
      // loop through car locations


/* loop through zones
      $( "ul.zones-list" ).children().each(function(i, elem) {
        var zone = {};
        if($(this).find('.zone-details').length != 0)  {
          zone.nameFull = $(this).find( ".zone-details" ).attr('title');
          var nameLT = zone.nameFull.replace(/[`„“~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
          zone.nameLT = nameLT.toLowerCase();
          var nameEN = zone.nameLT.replace(/ą/gi,'a').replace(/č/gi, 'c').replace(/ę|ė/gi, 'e').replace(/į/gi, 'i').replace(/š/gi, 's').replace(/ų|ū/gi, 'u').replace(/ž/gi, 'z').replace(/"/gi, '');
          zone.nameEN = nameEN.toLowerCase();
          zone.id = $(this).find( "input[name*='zone-id']" ).attr('value');
          zone.index = $(this).find( "input[name*='zone-id']" ).attr('value');
          //console.log(id + " " + name);
          zones.push(zone);
          //queryStringValues += "(" + zone.index + ", '" + zone.nameLT + "', '" + zone.nameEN + "', " + zone.id + "), ";
        }
        else {
          //console.log ('no zones');
        }
   

      });
      console.log ('end of loop');

*/
        
    } else {
        // http request failing
      console.error("error on request");
      console.log('error');
    }
  }); 

}

// find nearest car

function getNearestCars(UserLat, UserLng) {
  var url = 'https://login.citybee.lt/lt/';

  request({
    headers: {
      'Cookie': 'PHPSESSID=8m3an6jv3vtmurj9pv1u9a0od3; device_view=full; BCSI-CS-97976de0be87e764=2; BIGipServerglosC-proxyVIP-bc-RBB-web_gdcsfscs05-55_8050_pool=3242406179.29215.0000; _ga=GA1.2.500491733.1468570414; BCSI-CS-b933f65a4f518259=2; BIGipServerSlough-proxyVIP-bc-RBB-web-SLGSFSCS105-155_8050_pool=3778638102.29215.0000; __utmt=1; __utma=269912044.500491733.1468570414.1468570425.1468587689.2; __utmb=269912044.4.10.1468587689; __utmc=269912044; __utmz=269912044.1468587689.2.2.utmcsr=citybee.lt|utmccn=(referral)|utmcmd=referral|utmcct=/lt/'
    },
    uri: url,
    method: "POST",
    timeout: 100000,
    followRedirect: true,
    maxRedirects: 30
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // acction on HTTP request success

      console.log('http success');

      // parse html
      var cheerio = require('cheerio'),
      $ = cheerio.load(body);
        var script = $('script:contains("var opts")').html();
        
        script = script.substring(script.indexOf("var opts = {") + 11);
        script = script.substring(0, script.indexOf(";"));
        var carlocationsString = script.substring(script.indexOf("carslocations: [") + 14);
        carlocationsString = carlocationsString.substring(0, carlocationsString.indexOf("bicycleZonesLocations"));
        carlocationsString = carlocationsString.substring(0, carlocationsString.lastIndexOf(","));
        var carlocations = JSON.parse(carlocationsString);
        var type;
        // remove not needed types
        console.log(sender);
        if (typeof userOptions[sender] != 'undefined') {
          if (userOptions[sender].hasOwnProperty("type")) {

            var carType = userOptions[sender].type;
            console.log(carType);
            if (carType === "practical") {
              type = "0,18";
            }
            else if (carType === "comfort") {
              type = "0,23";
            }
            else if (carType === "cargo") {
              type = "0,25";
            }
            else if (carType === "premium") {
              type = "0,39"
            }
            else {
              type = "";
            }

          }
        

        console.log(type);
        console.log(userOptions[sender]);
        if (type) {
          for (i=0; i<carlocations.length; i++) {
            if(carlocations[i].tariffs.minutePrice.indexOf(type) < 0) {
              carlocations.splice(i,1);
              i = i - 1;
            } 
            else {

            } 
          }
          delete userOptions[sender].type;
        }
      } // end of if

     //   console.log(carlocations);
        console.log(carlocations.length);
        // continue checking what is near


        var OriginLat = UserLat;
        var OriginLong = UserLng;
        var p = 0.017453292519943295;    // Math.PI / 180
        var c = Math.cos;
        // loop through carlocations array calculate and add distance
        for (i = 0; i < carlocations.length; i++) {
          var lat1 = OriginLat;
          var lon1 = OriginLong;
          var lat2 = carlocations[i].lat;
          var lon2 = carlocations[i].lon;

          // distance calculation
            var a = 0.5 - c((lat2 - lat1) * p)/2 + 
                    c(lat1 * p) * c(lat2 * p) * 
                    (1 - c((lon2 - lon1) * p))/2;
            carlocations[i].distance = 12742 * Math.asin(Math.sqrt(a));
            carlocations[i].walkdistance = "";
            carlocations[i].walkdistanceval = "";

        }
        // sort carlocations array by distance

        carlocations.sort(function (a, b) {
          if (a.distance > b.distance) {
            return 1;
          }
          if (a.distance < b.distance) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });

        // run 10 nearest cars through google maps API to identify walking distance
        var googleAPIkey = "AIzaSyBi5yJFId0hOqgw-_gw2R-SQJtqf3zE2hU";
        var Origin = OriginLat + "," + OriginLong;
        var Destinations = "";
        var z;
        if (carlocations.length >= 25) { z=25 } else { z=carlocations.length}
          // loop through carlocations array to generate API url
        for (i = 0; i < z; i++) {
          Destinations += carlocations[i].lat;
          Destinations += ",";
          Destinations += carlocations[i].lon;
          Destinations += "|";
        }
        Destinations = Destinations.substring(0, Destinations.lastIndexOf("|"));
          // googleAPI distance matrix call
        var url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + Origin + '&destinations=' + Destinations + '&mode=walking&language=lt-LT&key=' + googleAPIkey;
        console.log (url);

          // api Call
        request({
          headers: {},
          uri: url,
          method: "GET",
          timeout: 10000,
          followRedirect: true,
          maxRedirects: 10
        }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            // acction on HTTP request success

            console.log('Google API http success');
            
            var distanceDetails = JSON.parse(body);
            console.log(distanceDetails);
            // add walking distance to 10 nearest stations if 10 exists

            for (i = 0; i < z; i++) {
                carlocations[i].walkdistance = distanceDetails.rows[0].elements[i].duration.text;
                carlocations[i].walkdistanceval = distanceDetails.rows[0].elements[i].distance.value;

              }

        // leave only z elements in array

        
        carlocations.splice(z, carlocations.length - z);


        // sort carlocations array by walking distance

        carlocations.sort(function (a, b) {
          if (a.walkdistanceval > b.walkdistanceval) {
            return 1;
          }
          if (a.walkdistanceval < b.walkdistanceval) {
            return -1;
          }
          if (a.walkdistanceval = "") {
            return 1;
          }
          // a must be equal to b
          return 0;
        });

          console.log(carlocations[0].walkdistanceval);
          console.log(carlocations[1].walkdistanceval);
          console.log(carlocations[0].walkdistance);
          console.log(carlocations[1].walkdistance);



            sendNearestCars(Origin);



          } else {
              // http request failing
            console.error("error on API request");
            console.log('error');

            // send NearestCards Without walking distance

            //

            sendNearestCars(Origin);




          }
        }); 



        // send 3 nearest cars

          // form elements

          function sendNearestCars(Origin) {

          var elements = [];
          var element = {};
          for (i = 0; i < 5; i++) {
            element = {
                title: carlocations[i].brand + " " + carlocations[i].model + " " + carlocations[i].licensePlate ,
                subtitle: carlocations[i].address.substring(0, carlocations[i].address.indexOf(",")) + ' (' + carlocations[i].walkdistance + ' )',
                item_url: 'https://login.citybee.lt/mobile/lt/reservation/create/' + carlocations[i].id,            
                image_url: carlocations[i].icon,
                buttons: [{
                  type: "web_url",
                  url: 'https://login.citybee.lt/mobile/lt/reservation/create/' + carlocations[i].id,    
                  title: "Rezervuoti"
                }, {
                  type: "web_url",
                  url: 'https://www.google.com/maps/dir/' + Origin + '/' + carlocations[i].lat + "," + carlocations[i].lon + '/data=!4m2!4m1!3e2',
                  title: "Keliauti",
                }],
              };
              elements.push(element);
            element = "";
          }
          
          // message format

          var messageData = {
            recipient: {
              id: sender
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: []
                }
              }
            }
          };

          messageData.message.attachment.payload.elements = elements;  
          //console.log(JSON.stringify(messageData, null, 4));
          callSendAPI(messageData);
        }

    } else {
        // http request failing
      console.error("error on request");
      console.log('error');
    }
  }); 

}

// get info

function getClosestLocation(UserLat, UserLng) {
  var url = "http://baranovas.lt/data.html";
  request({
    uri: url,
    method: "POST",
    timeout: 100000,
    followRedirect: true,
    maxRedirects: 10
  }, function(error, response, body) {
      var cheerio = require('cheerio'),
      $ = cheerio.load(body);        
      console.log('here');
      console.log(url);

      var places = [];
      var place = {};
      var element = {};
      var elements = [];

      $('div .place-item').each(function(i, elem) {
        place.title = $(this).find('.title').text();
        place.price = $(this).find('.pricerange').text();
        place.type = $(this).find('.type').text();
        place.address = $(this).find('.address').text();
        place.fblink = $(this).find('.fblink').attr('href');
        place.img = $(this).find('.img').attr('src');
        place.lat = $(this).find('.address').attr('lat');
        place.lon = $(this).find('.address').attr('long');
        places.push(place);
        place = {};
      });
      var OriginLat = UserLat;
      var OriginLong = UserLng;
      var p = 0.017453292519943295;    // Math.PI / 180
      var c = Math.cos;
      // loop through places array calculate and add distance
      for (i = 0; i < places.length; i++) {
        var lat1 = OriginLat;
        var lon1 = OriginLong;
        var lat2 = places[i].lat;
        var lon2 = places[i].lon;

        // distance calculation
          var a = 0.5 - c((lat2 - lat1) * p)/2 + 
                  c(lat1 * p) * c(lat2 * p) * 
                  (1 - c((lon2 - lon1) * p))/2;
          places[i].distance = 12742 * Math.asin(Math.sqrt(a));
          places[i].walkdistance = "";
          places[i].walkdistanceval = "";

      }
      // sort carlocations array by distance

      places.sort(function (a, b) {
        if (a.distance > b.distance) {
          return 1;
        }
        if (a.distance < b.distance) {
          return -1;
        }
        // a must be equal to b
        return 0;
        });

      for (i = 0; i < 5; i++) {
        console.log(places[i].title);
        console.log(places[i].distance);
      }
    // run 10 nearest cars through google maps API to identify walking distance
        var googleAPIkey = "AIzaSyBi5yJFId0hOqgw-_gw2R-SQJtqf3zE2hU";
        var Origin = OriginLat + "," + OriginLong;
        var Destinations = "";
        var z;
        if (places.length >= 25) { z=25 } else { z=places.length}
          // loop through carlocations array to generate API url
        for (i = 0; i < z; i++) {
          Destinations += places[i].lat;
          Destinations += ",";
          Destinations += places[i].lon;
          Destinations += "|";
        }
        Destinations = Destinations.substring(0, Destinations.lastIndexOf("|"));
          // googleAPI distance matrix call
        var url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + Origin + '&destinations=' + Destinations + '&mode=walking&language=lt-LT&key=' + googleAPIkey;
        console.log (url);

          // api Call
        request({
          headers: {},
          uri: url,
          method: "GET",
          timeout: 10000,
          followRedirect: true,
          maxRedirects: 10
        }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            // acction on HTTP request success

            console.log('Google API http success');
            
            var distanceDetails = JSON.parse(body);
            console.log(distanceDetails);
            // add walking distance to 10 nearest stations if 10 exists

            for (i = 0; i < z; i++) {
                places[i].walkdistance = distanceDetails.rows[0].elements[i].duration.text;
                places[i].walkdistanceval = distanceDetails.rows[0].elements[i].distance.value;

              }

        // leave only z elements in array

        
        places.splice(z, places.length - z);


        // sort carlocations array by walking distance

        places.sort(function (a, b) {
          if (a.walkdistanceval > b.walkdistanceval) {
            return 1;
          }
          if (a.walkdistanceval < b.walkdistanceval) {
            return -1;
          }
          if (a.walkdistanceval = "") {
            return 1;
          }
          // a must be equal to b
          return 0;
        });
          console.log(places[0].walkdistanceval);
          console.log(places[1].walkdistanceval);
          console.log(places[0].walkdistance);
          console.log(places[1].walkdistance);
         //   sendNearestCars(Origin);
          } else {
              // http request failing
            console.error("error on API request");
            console.log('error');
          }
        }); 
    });
};



// find nearest location




// end of find nearest location 


// function to send generic messages

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:app.get('page_access_token')},
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
      var messageData = {}
     // callSendAPI(messageData);
    }
  });  
}


function sendTextMessage(sender, text) {
    messageData = {
        text:text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:app.get('page_access_token')},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function changeThreadSettings() {

    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings',
        qs: {access_token:app.get('page_access_token')},
        method: 'POST',
        json: {
          setting_type : "call_to_actions",
          thread_state : "existing_thread",
          call_to_actions:[
            {
              "type":"postback",
              "title":"Pasirinkti pagal tipą",
              "payload":"select_type"
            },
            {
              "type":"postback",
              "title":"Pasirinkti pagal kainą",
              "payload":"select_price"
            },
            {
              "type":"postback",
              "title":"Ieškoti artimiausios vietos",
              "payload":"select_location"
            }

          ]
        }
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log('thread_settings set');
          console.log(body);
          console.log(response);
        }
        if (error) {
            console.log('Error sending thread_settings: ', error);
        } else if (response.body.error) {
            console.log('Error thread_settings: ', response.body.error);
        }
    });
}




function getHTTPinfo(sender) {
        var url = "http://baranovas.lt/data.html";
        request({
          uri: url,
          method: "POST",
          timeout: 100000,
          followRedirect: true,
          maxRedirects: 10
        }, function(error, response, body) {
          var cheerio = require('cheerio'),
          $ = cheerio.load(body);
          var text = $('.brand').text();          
          console.log('here');
          console.log(url);

          var places = [];
          var place = {};
          var element = {};
          var elements = [];

          $('div .place-item').each(function(i, elem) {
            place.title = $(this).find('.title').text();
            place.price = $(this).find('.pricerange').text();
            place.type = $(this).find('.type').text();
            place.address = $(this).find('.address').text();
            place.fblink = $(this).find('.fblink').attr('href');
            place.img = $(this).find('.img').attr('src');
            place.lat = $(this).find('.address').attr('lat');
            place.long = $(this).find('.address').attr('long');
            places.push(place);

            console.log(place);

            element = {
              title: place.title,
              subtitle: place.title,
              item_url: place.fblink,               
              image_url: place.img,
              buttons: [{
                type: "web_url",
                url: place.fblink,
                title: "Rezervuoti"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for first bubble"
              }],
            }; 
            elements.push(element);
          });
          
            var messageData = {
              recipient: {
                id: sender
              },
              message: {
                attachment: {
                  type: "template",
                  payload: {
                    template_type: "generic",
                    elements: elements
                  }
                }
              }
            };  
//            sendTextMessage(sender, cars[0].imageUrl);
        if(places.length > 0){   
          callSendAPI(messageData);
        }else{
          sendTextMessage(sender, "atsiprašome, nieko neradome");
        }
        

          //sendTextMessage(sender, brands);
        });    
};

function sendGenericMessage(recipientId) {
  var elements = [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }];
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };  
  callSendAPI(messageData);
};

// send quick reply to share location

function askLocation(type) {
    var messageData = {
      "recipient":{
        "id": sender
      },
      "message":{
        "text":"Pasidalink savo buvimo vieta: ",
        "quick_replies":[
          {
            "content_type":"location",
            "title":"location",
            "payload":"findcar"
           // "image_url":"http://petersfantastichats.com/img/green.png"
          }
        ]
      }
    }; 
    callSendAPI(messageData);
}




app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
  
