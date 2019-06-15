var debug = require('debug')('Homebridge');
var Accessory = require('./Accessory.js').Accessory;

module.exports = {
  Homebridge: Homebridge
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

function Homebridge(devices, context) {
  // debug("Homebridge", devices);
  this.accessories = [];
  this.host = devices.ipAddress;
  this.port = devices.instance.port;
  this.hb_name = devices.instance.name;
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
