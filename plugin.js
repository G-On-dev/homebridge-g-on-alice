"use strict";

var AliceLocal = require("./lib/aliceLocal.js").aliceLocal;
var aliceActions = require("./lib/aliceActions.js");
var EventEmitter = require("events").EventEmitter;
// var debug = require('debug')('alicePlugin');

const packageConfig = require("./package.json");

var options = {};

module.exports = function (homebridge) {
  homebridge.registerPlatform("homebridge-g-on-alice", "G-On Alice", aliceHome);
};

function aliceHome(log, config, api) {
  this.log = log;
  this.eventBus = new EventEmitter();
  this.config = config;
  this.pin = config["pin"] || "031-45-154";
  this.username = config["username"] || false;
  this.password = config["password"] || false;

  // Enable config based DEBUG logging enable
  this.debug = config["debug"] || false;
  if (this.debug) {
    let debugEnable = require("debug");
    let namespaces = debugEnable.disable();

    // this.log("DEBUG-1", namespaces);
    if (namespaces) {
      namespaces = namespaces + ",g-on-alice*";
    } else {
      namespaces = "g-on-alice*";
    }
    // this.log("DEBUG-2", namespaces);
    debugEnable.enable(namespaces);
  }

  if (!this.username || !this.password) {
    this.log.error("Missing username and password");
  }

  if (api) {
    this.api = api;
    this.api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
  }

  this.log.info("%s v%s, node %s, homebridge v%s", packageConfig.name, packageConfig.version, process.version, api.serverVersion);
}

aliceHome.prototype = {
  accessories: function (callback) {
    this.log("accessories");
    callback();
  },
};

aliceHome.prototype.didFinishLaunching = function () {
  var host = "homebridge.g-on.io";
  // var host = 'localhost';

  options = {
    eventBus: this.eventBus,
    username: this.username,
    password: this.password,
    clientId: this.username,
    debug: this.debug,
    log: this.log,
    pin: this.pin,
    servers: [
      {
        protocol: "mqtt",
        host: host,
        port: 1883,
      },
    ],
    refresh: 30, //HAP Client pooling interval
  };

  // Initialize HAP Connections
  aliceActions.hapDiscovery(options);

  var alice = new AliceLocal(options);

  // Alice mesages

  this.eventBus.on("discovery", aliceActions.aliceDiscovery.bind(this));
  this.eventBus.on("action", aliceActions.aliceAction.bind(this));
  this.eventBus.on("query", aliceActions.aliceQuery.bind(this));
};

aliceHome.prototype.configureAccessory = function (accessory) {
  this.log("configureAccessory");
  // callback();
};
