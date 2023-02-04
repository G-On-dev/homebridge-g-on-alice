"use strict";

const AliceLocal = require("./lib/AliceLocal.js");
const AliceActions = require("./lib/AliceActions.js");
const debug = require("debug")("alicePlugin");
const packageConfig = require("./package.json");

class AliceHome {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.pin = config["pin"] || "031-45-154";
    this.username = config["username"] || false;
    this.password = config["password"] || false;
    this.aliceActions = null;
    this.aliceLocal = null;

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

  didFinishLaunching() {
    const host = "homebridge.g-on.io";

    const options = {
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
    };

    // Initialize HAP Connections
    this.aliceActions = new AliceActions(options);

    this.aliceLocal = new AliceLocal(options);

    // Alice messages
    this.aliceLocal.on("discovery", this.aliceActions.aliceDiscovery.bind(this));
    this.aliceLocal.on("action", this.aliceActions.aliceAction.bind(this));
    this.aliceLocal.on("query", this.aliceActions.aliceQuery.bind(this));
  }

  accessories() {
    return;
  }

  configureAccessory() {
    //
  }
}

module.exports = (homebridge) => {
  homebridge.registerPlatform("homebridge-g-on-alice", "G-On Alice", AliceHome);
};
