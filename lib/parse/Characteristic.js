const debug = require("debug")("Characteristic");
const messages = require("./messages.js");

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

class Characteristic {
  constructor(devices, context) {
    //console.log("Characteristic", devices, context);
    this.aid = context.aid;
    this.iid = devices.iid;
    this.type = parseInt(devices.type, 16).toString(16).toUpperCase();
    this.value = devices.value;

    this.description = devices.description;

    if (devices["valid-values"]) {
      // allowes thermostat modes or temperature units
      this.validValues = devices["valid-values"];
    } else {
      if (devices.validValues) {
        // allowes thermostat modes or temperature units
        this.validValues = devices.validValues;
      }
    }
    this.capabilities = messages.lookupCapabilities(this);
  }
}

module.exports = Characteristic;
