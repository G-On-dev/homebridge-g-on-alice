// Local event based client for alice
//
// Generates events for each G-On Alice Skill message
//

"use strict";

const mqtt = require("mqtt");
const MQTTPattern = require("mqtt-pattern");
const debug = require("debug")("aliceLocal");
const packageConfig = require("../package.json");
const Bottleneck = require("bottleneck");
const EventEmitter = require("events").EventEmitter;

class AliceLocal extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.log = options.log;
    this.log("Connecting to Homebridge Smart Home Skill");

    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      highWater: 10,
      minTime: 2000,
      strategy: Bottleneck.strategy.BLOCK,
    });
    this.count = 0;
    this.connection = {};

    this.limiter.on("dropped", (dropped) => {
      this.log("WARNING: Dropped event message, message rate too high.");
    });

    this.connection.client = mqtt.connect(this.options);
    this.connection.client.on("connect", this.connect.bind(this));

    this.connection.client.on("offline", () => {
      this.log("offline");
    });

    this.connection.client.on("reconnect", () => {
      this.count++;
      this.log("reconnect");
      if (this.count % 5 === 0) this.log("ERROR: No connection to homebridge.g-on.io. Retrying... please review the README and the Homebridge configuration.");
    });

    this.connection.client.on("error", (err) => {
      this.log("error", err);
    });
  }

  connect() {
    this.connection.client.removeAllListeners("message");
    this.connection.client.subscribe("command/" + this.options.username + "/discovery");
    this.connection.client.subscribe("command/" + this.options.username + "/action");
    this.connection.client.subscribe("command/" + this.options.username + "/query");
    this.connection.client.publish(
      "presence/" + this.options.username + "/1",
      JSON.stringify({
        Connected: this.options.username,
        version: packageConfig.version,
      })
    );

    this.connection.client.on("message", this.message.bind(this));
  }

  publish(topic, message) {
    this.connection.client.publish(topic, JSON.stringify(message));
  }

  message(topic, message) {
    let msg = {};

    try {
      msg = JSON.parse(message.toString());
    } catch (e) {
      debug("JSON message is empty or not valid");
      msg = {};
    }

    const topic_params = MQTTPattern.exec("command/+login/+request", topic);

    if (this.listenerCount(topic_params.request) > 0) {
      this.emit(topic_params.request, { msg, topic_params });
    } else {
      debug("No listener for", topic_params.request);
    }
  }
}

module.exports = AliceLocal;
