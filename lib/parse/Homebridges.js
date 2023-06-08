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
  //console.log("Homebridges", devices);
  this.homebridges = [];

  devices.forEach(function(element) {
    var homebridge = new Homebridge(element, context);
    this.homebridges.push(homebridge);
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

Homebridges.prototype.getDevicesHBName = function(devices) {
  return devices.map(device_data => this.checkThatDeviceExists(device_data.id).homebridge.hb_name)
}

Homebridges.prototype.checkThatDeviceExistsNoti = function(event_data) {
  var homebridge_data = null;
  for (var homebridge_index in this.homebridges) {
    var homebridge_data = this.homebridges[homebridge_index];
    if (homebridge_data.deviceID == event_data.deviceID) {
      for (var accessory_index in homebridge_data.accessories) {
        var accessory_data = homebridge_data.accessories[accessory_index];
        for (var service_index in accessory_data.services) {
          var service_data = accessory_data.services[service_index];
          for (var characteristic_index in service_data.characteristics) {
            var characteristic_data = service_data.characteristics[characteristic_index];
            if (characteristic_data.aid == event_data.aid && characteristic_data.iid == event_data.iid) {
              characteristic_data.value = event_data.value;
              return {
                homebridge: homebridge_data,
                accessory: accessory_data,
                service: service_data,
                characteristic: characteristic_data,
              };

            }
          }
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

Homebridges.prototype.onNotifies = function() {
  var list = [];
  this.homebridges.forEach(function(homebridge) {
    var data = {
      "deviceID": homebridge.deviceID,
      "characteristics": []
    }
    for (var index in homebridge.accessories) {
      var accessory = homebridge.accessories[index];
      for (var index in accessory.services) {
        var service = accessory.services[index];
        for (var index in service.characteristics) {
          var characteristic = service.characteristics[index];
          if (characteristic.capabilities.length || characteristic.properties.length) {
            data.characteristics.push({
              "aid": characteristic.aid,
              "iid": characteristic.iid,
              "ev": true
            })
          }
        }
      }
    }
    if (data.characteristics.length > 0) {
      list.push(data);
    }
  });
  return list;
};