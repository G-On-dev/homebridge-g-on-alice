var debug = require('debug')('Homebridges');
var Homebridge = require('./Homebridge.js').Homebridge;

var os = require('os');
var ifaces = os.networkInterfaces();

module.exports = {
  Homebridges: Homebridges
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

function Homebridges(devices, context) {
  // debug("Homebridges", devices);
  this.homebridges = [];

  devices.forEach(function(element) {
    if (checkHomeBridgeIpAddress(element.ipAddress)) {
      var homebridge = new Homebridge(element, context);
      this.homebridges.push(homebridge);
    }
  }.bind(this));
}

Homebridges.prototype.getDevicesAndCapabilities = function(message) {
  var list = [];
  for (var index in this.homebridges) {
    var homebridge = this.homebridges[index];
    list = list.concat(homebridge.getDevicesAndCapabilities());
  }

  var response = {
    "payload": {
      "devices": list
    }
  };

  if (message && message.hasOwnProperty('request_id')) {
    response.request_id = message.request_id;
  }
  return (response);
};


Homebridges.prototype.checkThatDeviceExists = function(device_id) {
  // device_id = homebridge-name_accessory-id_service-id
  
  var homebridge_data = null;
  for (var homebridge_index in this.homebridges) {
    var homebridge_data = this.homebridges[homebridge_index];
    for (var accessory_index in homebridge_data.accessories) {
      var accessory_data = homebridge_data.accessories[accessory_index];
      for (var service_index in accessory_data.services) {
        var service_data = accessory_data.services[service_index];
        if (accessory_data.services[service_index].id == device_id) {
          // we found the device
          return {
            homebridge: homebridge_data,
            accessory: accessory_data,
            service: service_data
          };
        }
      }
    }
  }

  // no such HomeBridge Device Id found
  return {
    error_code: "DEVICE_NOT_FOUND",
    error_message: "Homebridge Device with such id is not found"
  };
}

function checkHomeBridgeIpAddress(hb_ip_address) {
  for(var i = 0; i < Object.keys(ifaces).length; i++) {
    var ifname = Object.keys(ifaces)[i];
    for(var j = 0; j < ifaces[ifname].length; j++) {
      var iface = ifaces[ifname][j];
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      if (iface.address == hb_ip_address) {
        // same as ours, proceed
        return true;
      }
    };
  };
  return false;
}
