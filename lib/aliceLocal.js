// Local event based client for alice
//
// Generates events for each G-On Alice Skill message
//

"use strict";

var mqtt = require('mqtt');
var MQTTPattern = require('mqtt-pattern');
var debug = require('debug')('aliceLocal');
const packageConfig = require('../package.json');
var Bottleneck = require("bottleneck");

var connection = {};
var count = 0;
var username;
var limiter;

module.exports = {
  aliceLocal: aliceLocal,
  aliceEvent: aliceEvent
};

function aliceLocal(options) {
  debug("Connecting to Homebridge Smart Home Skill");
  // Throttle event's to match Amazon's Rate API
  // Limit events to one every 30 seconds, and keep at most 5 minutes worth
  limiter = new Bottleneck({
    maxConcurrent: 1,
    highWater: 10,
    minTime: 2000,
    strategy: Bottleneck.strategy.BLOCK
  });

  limiter.on("dropped", function(dropped) {
    options.log("WARNING: Dropped event message, message rate too high.");
  });

  username = options.username;
  connection.client = mqtt.connect(options);
  // connection.client.setMaxListeners(0);
  connection.client.on('connect', function() {
    debug('connect', "command/" + options.username + "/#");
    connection.client.removeAllListeners('message'); // This hangs up everyone on the channel
    connection.client.subscribe("command/" + options.username + "/discovery");
    connection.client.subscribe("command/" + options.username + "/action");
    connection.client.subscribe("command/" + options.username + "/query");
    connection.client.publish("presence/" + options.username + "/1", JSON.stringify({
      Connected: options.username,
      version: packageConfig.version
    }));
    connection.client.on('message', function(topic, message) {
      var msg = {};
      
      try {
        msg = JSON.parse(message.toString());
      } catch(e) {
        debug("JSON message is empty or not valid");
        msg = {};
      }
      
      var topic_params = MQTTPattern.exec("command/+login/+request", topic);

      if (options.eventBus.listenerCount(topic_params.request) > 0) {
        options.eventBus.emit(topic_params.request, msg, function(err, response) {
          // TODO: if no message, return error Response
          if (response == null) {
            if (err) {
              debug('Error', err.message);
            } else {
              debug('Error no response');
            }
          } else {
            if (err) {
              debug('Error, but still emitting response', err.message);
              connection.client.publish("response/" + options.username + "/" + topic_params.request, JSON.stringify(response));
            } else {
              debug('Emitting', topic_params.request);
              connection.client.publish("response/" + options.username + "/" + topic_params.request, JSON.stringify(response));
            }
          }
        });
      } else {
        debug('No listener for', topic_params.request);
      }
    });
  });

  connection.client.on('offline', function() {
    debug('offline');
  });

  connection.client.on('reconnect', function() {
    count++;
    debug('reconnect');
    if (count % 5 === 0) options.log("ERROR: No connection to homebridge.g-on.io. Retrying... please review the README and the Homebridge configuration.");
  });

  connection.client.on('error', function(err) {
    debug('error', err);
  });
}

function aliceEvent(message) {
  connection.client.publish("response/" + username + "/callback", JSON.stringify(message));
}