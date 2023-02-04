const debug = require("debug")("Homebridges");
const Homebridge = require("./Homebridge.js");

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

class Homebridges {
  constructor(devices, context) {
    this.homebridges = [];

    devices.forEach((element) => {
      const homebridge = new Homebridge(element, context);
      this.homebridges.push(homebridge);
    });
  }

  getDevicesAndCapabilities(message) {
    let list = [];
    for (let index in this.homebridges) {
      const homebridge = this.homebridges[index];
      list = list.concat(homebridge.getDevicesAndCapabilities());
    }

    const response = {
      payload: {
        devices: list,
      },
    };

    if (message && message.hasOwnProperty("request_id")) {
      response.request_id = message.request_id;
    }
    return response;
  }

  checkThatDeviceExists(device_id) {
    // device_id = homebridge-name_accessory-id_service-id

    for (let homebridge_index in this.homebridges) {
      const homebridge_data = this.homebridges[homebridge_index];
      for (let accessory_index in homebridge_data.accessories) {
        const accessory_data = homebridge_data.accessories[accessory_index];
        for (let service_index in accessory_data.services) {
          const service_data = accessory_data.services[service_index];
          if (accessory_data.services[service_index].id == device_id) {
            // we found the device
            return {
              homebridge: homebridge_data,
              accessory: accessory_data,
              service: service_data,
            };
          }
        }
      }
    }

    // no such HomeBridge Device Id found
    return {
      error_code: "DEVICE_NOT_FOUND",
      error_message: "Homebridge Device with such id is not found",
    };
  }

  getDevicesHBName(devices) {
    return devices.map((device_data) => this.checkThatDeviceExists(device_data.id).homebridge.hb_name);
  }
}

module.exports = Homebridges;
