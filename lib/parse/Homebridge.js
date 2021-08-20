var debug = require('debug')('Homebridge');
var Accessory = require('./Accessory.js').Accessory;

module.exports = {
  Homebridge: Homebridge
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

function Homebridge(devices, context) {
  //console.log("Homebridge", devices);
  this.accessories = [];
  this.host = devices.ipAddress;
  this.port = devices.instance.port;
  this.hb_name = this.findHomebridgeName(devices);
  devices.accessories.accessories.forEach(function(element) {
    var accessory = new Accessory(element, this);
    if (this.accessories[accessory.name]) {
      debug("Duplicate", accessory.name);
    } else {
      // debug("Adding", accessory.name)
      this.accessories[accessory.name] = accessory;
    }
  }.bind(this));
}

Homebridge.prototype.findHomebridgeName = function(devices) {
  var found_hb = false;
  var hb_name = null;
  for (accessory of devices.accessories.accessories) {
    for (service of accessory.services) {
      if (parseInt(service.type,16).toString(16).toUpperCase() == "3E") {
        // Accessory Information
        for (characteristic of service.characteristics) {
          if (characteristic.description) {
            var key = characteristic.description.replace(/ /g, '').replace(/\./g, '_');
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

Homebridge.prototype.getDevicesAndCapabilities = function() {
  var list = [];

  // Alice devices made up of multiple homekit accessories in a single homebridge instance
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    var accessory_data = accessory.getDeviceCapabilities();
    
    if (accessory_data) {
      list = list.concat(accessory_data);
    }
  }
  return (list);
};
