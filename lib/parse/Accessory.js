var debug = require('debug')('Accessory');
var Service = require('./Service.js').Service;

module.exports = {
  Accessory: Accessory
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */
function Accessory(devices, context) {
  //console.log("Accessory", devices);
  this.aid = devices.aid;
  this.host = context.host;
  this.port = context.port;
  this.hb_name = context.hb_name;
  this.services = {};
  devices.services.forEach(function(element) {
    switch (parseInt(element.type,16).toString(16).toUpperCase()) {
      case "3E": // Accessory Information
        this.info = information(element.characteristics);
        this.name = this.info.Name;
        break;
      default:
        if (!this.info) {
          this.name = "Unknown";
          this.info = {};
          this.info.Manufacturer = "Unknown";
          this.info.Name = "Unknown";
        }
        var service = new Service(element, this);
        this.services[service.iid] = service;
    }
  }.bind(this));
}

Accessory.prototype.getDeviceCapabilities = function() {
  var list = [];
  var context = {
    aid: this.aid,
    name: this.info.Name,
    manufacturer: this.info.Manufacturer,
    model: this.info.Model
  }

  for (var index in this.services) {
    var service = this.services[index];
    var service_data = service.getDeviceCapabilities(context);
    if (service_data) {
      list = list.concat(service_data);
    }
  }

  return (list);
};

function information(characteristics) {
  var result = {};
  characteristics.forEach(function(characteristic) {
    if (characteristic.description) {
      var key = characteristic.description.replace(/ /g, '').replace(/\./g, '_');
      result[key] = characteristic.value;
    }
  });
  return result;
}
