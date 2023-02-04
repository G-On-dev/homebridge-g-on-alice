const debug = require("debug")("Accessory");
const Service = require("./Service.js");

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */
class Accessory {
  constructor(devices, context) {
    //console.log("Accessory", devices);
    this.aid = devices.aid;
    this.host = context.host;
    this.port = context.port;
    this.hb_name = context.hb_name;
    this.services = {};
    devices.services.forEach((element) => {
      switch (parseInt(element.type, 16).toString(16).toUpperCase()) {
        case "3E": // Accessory Information
          this.info = this.information(element.characteristics);
          this.name = this.info.Name;
          break;
        default:
          if (!this.info) {
            this.name = "Unknown";
            this.info = {};
            this.info.Manufacturer = "Unknown";
            this.info.Name = "Unknown";
          }
          const service = new Service(element, this);
          this.services[service.iid] = service;
      }
    });
  }

  getDeviceCapabilities() {
    let list = [];
    const context = {
      aid: this.aid,
      name: this.info.Name,
      manufacturer: this.info.Manufacturer,
      model: this.info.Model,
    };

    for (let index in this.services) {
      const service = this.services[index];
      const service_data = service.getDeviceCapabilities(context);
      if (service_data) {
        list = list.concat(service_data);
      }
    }

    return list;
  }

  information(characteristics) {
    const result = {};
    characteristics.forEach(function (characteristic) {
      if (characteristic.description) {
        const key = characteristic.description.replace(/ /g, "").replace(/\./g, "_");
        result[key] = characteristic.value;
      }
    });
    return result;
  }
}

module.exports = Accessory;
