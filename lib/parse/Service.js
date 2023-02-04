const debug = require("debug")("Service");
const Characteristic = require("./Characteristic.js");
const messages = require("./messages.js");

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

class Service {
  constructor(devices, context) {
    //console.log("Service", devices);
    this.iid = devices.iid;
    this.type = parseInt(devices.type, 16).toString(16).toUpperCase();

    this.aid = context.aid;
    this.host = context.host;
    this.port = context.port;
    this.hb_name = context.hb_name;
    this.info = context.info;
    this.characteristics = [];
    this.id = `${this.hb_name}_${this.aid}_${this.iid}`;
    devices.characteristics.forEach((element) => {
      const service = new Characteristic(element, this);
      if (parseInt(element.type, 16).toString(16).toUpperCase() === "23" && element.description === "Name") {
        this.name = element.value;
      } else {
        if (this.characteristics[service.description]) {
          // debug("Duplicate", this.name, service.description);
        } else {
          // debug("Adding", this.name, service.iid, service.description);
          this.characteristics[service.description] = service;
        }
      }
    });
  }

  getDeviceCapabilities(context) {
    let capabilities = [];

    if (this.name) {
      context.name = this.name;
    }

    for (let index in this.characteristics) {
      const characteristic = this.characteristics[index];
      if (characteristic.type !== "23" && characteristic.capabilities) {
        capabilities = capabilities.concat(characteristic.capabilities);
      }
    }

    if (capabilities.length > 0) {
      return {
        id: this.id,
        name: context.name,
        description: this.hb_name + " " + context.name,
        type: messages.lookupDeviceType(this.type),
        capabilities: capabilities,
        device_info: {
          manufacturer: context.manufacturer,
          model: context.model,
        },
      };
    }
  }

  getDeviceState() {
    const device_state = {
      id: this.id,
      capabilities: [],
    };

    for (let index in this.characteristics) {
      const characteristic_data = this.characteristics[index];
      if (characteristic_data.type !== "23" && characteristic_data.capabilities) {
        for (let i = 0; i < characteristic_data.capabilities.length; i++) {
          const capability_data = characteristic_data.capabilities[i];
          const converted_capability_state = messages.convertHomeBridgeValueToAliceValue(capability_data, characteristic_data, this.characteristics);

          if (converted_capability_state.error_code) {
            return {
              id: this.id,
              error_code: converted_capability_state.error_code,
              error_message: converted_capability_state.error_message,
            };
          }

          device_state.capabilities.push(converted_capability_state);
        }
      }
    }

    return device_state;
  }

  getCharacteristicIidAndValueFromCapability(request_capability_data) {
    for (let index in this.characteristics) {
      const characteristic_data = this.characteristics[index];
      if (characteristic_data.type !== "23" && characteristic_data.capabilities) {
        for (let i = 0; i < characteristic_data.capabilities.length; i++) {
          const service_capability = characteristic_data.capabilities[i];

          if (service_capability.type == request_capability_data.type) {
            // we found request capability
            const converted_value = messages.convertAliceValueToHomeBridgeValue(request_capability_data);

            if (converted_value.error_code) {
              return converted_value;
            }

            return {
              aid: characteristic_data.aid,
              iid: characteristic_data.iid,
              value: converted_value.value,
            };
          }
        }
      }
    }

    // no such capability found
    return {
      error_code: "INVALID_ACTION",
      error_message: "Requested capability is not found for requested Homebridge Device",
    };
  }
}

module.exports = Service;
