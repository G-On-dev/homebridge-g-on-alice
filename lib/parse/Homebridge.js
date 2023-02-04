const debug = require("debug")("Homebridge");
const Accessory = require("./Accessory.js");

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

class Homebridge {
  constructor(devices, context) {
    this.accessories = [];
    this.host = devices.ipAddress;
    this.port = devices.instance.port;
    this.hb_name = this.findHomebridgeName(devices);
    devices.accessories.accessories.forEach((element) => {
      var accessory = new Accessory(element, this);
      if (this.accessories[accessory.name]) {
        debug("Duplicate", accessory.name);
      } else {
        // debug("Adding", accessory.name)
        this.accessories[accessory.name] = accessory;
      }
    });
  }

  getDevicesAndCapabilities() {
    let list = [];

    // Alice devices made up of multiple homekit accessories in a single homebridge instance
    for (let index in this.accessories) {
      const accessory = this.accessories[index];
      const accessory_data = accessory.getDeviceCapabilities();

      if (accessory_data) {
        list = list.concat(accessory_data);
      }
    }
    return list;
  }

  findHomebridgeName(devices) {
    let found_hb = false;
    let hb_name = null;
    for (let accessory of devices.accessories.accessories) {
      for (let service of accessory.services) {
        if (parseInt(service.type, 16).toString(16).toUpperCase() == "3E") {
          // Accessory Information
          for (let characteristic of service.characteristics) {
            if (characteristic.description) {
              let key = characteristic.description.replace(/ /g, "").replace(/\./g, "_");
              if (key == "Model") {
                if (characteristic.value == "homebridge") {
                  found_hb = true;
                }
              }
              if (key == "Name") {
                hb_name = characteristic.value;
              }
            }
          }
        }

        if (found_hb) {
          break;
        }
      }

      if (found_hb) {
        break;
      }
    }

    if (hb_name) {
      return hb_name;
    } else {
      return "unknown_hb";
    }
  }
}

module.exports = Homebridge;
