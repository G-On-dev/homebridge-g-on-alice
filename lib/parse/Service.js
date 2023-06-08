var debug = require('debug')('Service');
var Characteristic = require('./Characteristic.js').Characteristic;
var messages = require('./messages.js');

module.exports = {
  Service: Service
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

function Service(devices, context) {
  //console.log("Service", devices);
  this.iid = devices.iid;
  this.type = parseInt(devices.type,16).toString(16).toUpperCase();
  
  this.aid = context.aid;
  this.host = context.host;
  this.port = context.port;
  this.hb_name = context.hb_name;
  this.info = context.info;
  this.characteristics = [];
  this.id = this.hb_name + "_" + this.aid + "_" + this.iid;
  devices.characteristics.forEach(function(element) {
    var service = new Characteristic(element, this);
    if (parseInt(element.type,16).toString(16).toUpperCase() === '23' && element.description === "Name") {
      this.name = element.value;
    } else {
      if (this.characteristics[service.description]) {
        // debug("Duplicate", this.name, service.description);
      } else {
        // debug("Adding", this.name, service.iid, service.description);
        this.characteristics[service.description] = service;
      }
    }
  }.bind(this));
}

Service.prototype.getDeviceCapabilities = function(context) {
  var capabilities = [];
  var properties = [];

  if (this.name) {
    context.name = this.name;
  }

  for (var index in this.characteristics) {
    var characteristic = this.characteristics[index];
    if (characteristic.type !== '23') {
      var _capabilities = characteristic.capabilities;
      if (_capabilities.length) {
        var f_1 = _capabilities.findIndex(cap => cap.type == "devices.capabilities.color_setting");
        var f_2 = capabilities.findIndex(cap => cap.type == "devices.capabilities.color_setting");
        if (f_1 !== -1 && f_2 !== -1) {
          Object.assign(capabilities[f_2].parameters, _capabilities[f_1].parameters);
        } else
          capabilities = capabilities.concat(_capabilities);
      }
      var _properties = characteristic.properties;
      if (_properties.length) {
        properties = properties.concat(_properties);
      }
    }
  }

  if (capabilities.length > 0 || properties.length > 0) {
    var data = {
      id: this.id,
      name: context.name,
      description: this.hb_name + " " + context.name,
      type: messages.lookupDeviceType(this.type),
      device_info: {
        manufacturer: context.manufacturer,
        model: context.model
      }
    };
    if (capabilities.length > 0) data.capabilities = capabilities;
    if (properties.length > 0) data.properties = properties;

    return data;
  }
};
Service.prototype.getDeviceState = function(homebridge, deviceId) {
  return new Promise((resolve, reject) => {
    var device_state = {
      id: this.id
    };
    var res = [];

    for (var index in this.characteristics) {
      var characteristic_data = this.characteristics[index];
      if (characteristic_data.type !== '23' && characteristic_data.capabilities) {
        var pr = new Promise((resolve, reject) => {
          var chd = characteristic_data;
          homebridge.HAPstatusByDeviceID(deviceId, "?id=" + characteristic_data.aid + "." + characteristic_data.iid, function(err, response) {
            if (err) reject()
            else {
              var characteristic_data = chd;
              var capts = [];
              for (var i = 0; i < characteristic_data.capabilities.length; i++) {
                var capability_data = characteristic_data.capabilities[i];
                characteristic_data = Object.assign(characteristic_data, response.characteristics[0]);
                var converted_capability_state = messages.convertHomeBridgeValueToAliceValue(capability_data, characteristic_data);
                if (converted_capability_state.error_code)
                  reject()
                else
                  capts.push(converted_capability_state);
              }
              for (var i = 0; i < characteristic_data.properties.length; i++) {
                var propertie_data = characteristic_data.properties[i];
                characteristic_data = Object.assign(characteristic_data, response.characteristics[0]);
                var converted_capability_state = messages.convertHomeBridgeValueToAliceValue(propertie_data, characteristic_data);
                if (converted_capability_state.error_code) {
                  reject()
                } else {
                  capts.push(converted_capability_state);
                }
              }
              resolve(capts);
            }
          });
        });
        res.push(pr);
      }
    }

    Promise.all(res).then((data) => {
      var dataF = data.flat();
      var dataHSV = dataF.map((element, index) => element.type === "devices.capabilities.color_setting" && element.state.instance && element.state.instance == "hsv" ? index : -1).filter(element => element !== -1);
      if (dataHSV.length > 1) {
        for (var i = 1; i < dataHSV.length; i++) {
          Object.assign(dataF[dataHSV[0]].state.value, dataF[dataHSV[i]].state.value);
          dataF.splice(dataHSV[i], 1);
        }
      } else if (dataHSV.length == 1) {
        if (!dataF[dataHSV[0]].state.value.hasOwnProperty("h")) dataF[dataHSV[0]].state.value.h = 0;
        if (!dataF[dataHSV[0]].state.value.hasOwnProperty("s")) dataF[dataHSV[0]].state.value.s = 100;
        if (!dataF[dataHSV[0]].state.value.hasOwnProperty("v")) dataF[dataHSV[0]].state.value.v = 100;
      }
      for (var i = 0; i < dataF.length; i++) {
        var d = dataF[i];
        if (d.type === "devices.properties.float" || d.type === "devices.properties.event") {
          if (!device_state.hasOwnProperty("properties")) device_state.properties = [];
          device_state.properties.push(d);
        } else {
          if (!device_state.hasOwnProperty("capabilities")) device_state.capabilities = [];
          device_state.capabilities.push(d);
        }

      }
      resolve(device_state);
    }).catch(error => {
      resolve({
        id: this.id,
        error_code: "INTERNAL_ERROR",
        error_message: "Requested capability is not found for requested Homebridge Device"
      });
    });
  })
}
Service.prototype.getCharacteristicIidAndValueFromCapability = function(request_capability_data) {
  var data = [];
  for (var index in this.characteristics) {
    var characteristic_data = this.characteristics[index];
    if (characteristic_data.type !== '23' && characteristic_data.capabilities) {
      for (var i = 0; i < characteristic_data.capabilities.length; i++) {
        var service_capability = characteristic_data.capabilities[i];
        if (service_capability.type == request_capability_data.type) {
          if (request_capability_data.state && request_capability_data.state.instance && service_capability.parameters && service_capability.parameters.instance && service_capability.parameters.instance !== request_capability_data.state.instance)
            continue;
          if (service_capability.type == "devices.capabilities.color_setting") {
            if ((characteristic_data.description == 'Hue' || characteristic_data.description == 'Saturation') && request_capability_data.state.instance != 'hsv') continue;
            if (characteristic_data.description == 'Color Temperature' && request_capability_data.state.instance != 'temperature_k') continue;
          }
          // we found request capability
          var converted_value = messages.convertAliceValueToHomeBridgeValue(characteristic_data, request_capability_data);
          if (converted_value.error_code) {
            data.push(converted_value);
          } else {
            data.push({
              aid: characteristic_data.aid,
              iid: characteristic_data.iid,
              value: converted_value.value,
            });
          }
        }
      }
    }
  }
  if (data.length) return data;

  // no such capability found
  return {
    error_code: "INVALID_ACTION",
    error_message: "Requested capability is not found for requested Homebridge Device"
  };
}
