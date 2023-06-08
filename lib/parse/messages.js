var debug = require('debug')('messages');

module.exports = {
  lookupCapabilities: lookupCapabilities,
  lookupProperties: lookupProperties,
  lookupDeviceType: lookupDeviceType,
  convertAliceValueToHomeBridgeValue: convertAliceValueToHomeBridgeValue,
  convertHomeBridgeValueToAliceValue: convertHomeBridgeValueToAliceValue
};

function lookupCapabilities(characteristic_data) {
  var response = [];

  switch (characteristic_data.description) {
    case "Active": // Air Purifier, Fanv2, Faucet, Heater Cooler, Humidifier Dehumidifier, Valve, Television, Television Speaker, Speaker
      if (characteristic_data.serviceType != "41" && characteristic_data.serviceType != "45" && characteristic_data.serviceType != "81" && characteristic_data.serviceType != "8B" && characteristic_data.serviceType != "8C" && characteristic_data.serviceType != "4A") {
        response.push({
          "type": "devices.capabilities.on_off",
          "retrievable": true
        });
      }
      break;
    case "On": // Fan, Lightbulb, Outlet, Switch
    case "Target Door State": // Garage Door Opener
    case "Lock Target State": // Lock Mechanism
      response.push({
        "type": "devices.capabilities.on_off",
        "retrievable": true
      });
      break;
    case "Rotation Speed": // Air Purifier, Fan, Fanv2, Heater Cooler, Humidifier Dehumidifier, 
      response.push({
        "type": "devices.capabilities.mode",
        "retrievable": true,
        "parameters": {
          "instance": "fan_speed",
          "modes": [{
            "value": "high"
          }, {
            "value": "medium"
          }, {
            "value": "low"
          }]
        }
      });
      break;
    case "Target Position": // Door, Window, Window Covering
      response.push({
        "type": "devices.capabilities.on_off",
        "retrievable": true
      }, {
        "type": "devices.capabilities.range",
        "retrievable": true,
        "parameters": {
          "instance": "open",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 10
          }
        }
      });
      break;
    case "Target Heater-Cooler State": // Heater Cooler
      response.push({
        "type": "devices.capabilities.mode",
        "retrievable": true,
        "parameters": {
          "instance": "thermostat",
          "modes": [{
            "value": "heat"
          }, {
            "value": "cool"
          }, {
            "value": "auto"
          }]
        }
      });
      break;
    case "Relative Humidity Dehumidifier Threshold": // Humidifier Dehumidifier
    case "Relative Humidity Humidifier Threshold": // Humidifier Dehumidifier
    case "Target Relative Humidity": // Thermostat
      response.push({
        "type": "devices.capabilities.range",
        "retrievable": true,
        "parameters": {
          "instance": "humidity",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case "Brightness": // Lightbulb
      response.push({
        "type": "devices.capabilities.range",
        "retrievable": true,
        "parameters": {
          "instance": "brightness",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case "Color Temperature": // Lightbulb
      response.push({
        "type": "devices.capabilities.color_setting",
        "retrievable": true,
        "parameters": {
          "temperature_k": {
            "max": characteristic_data.maxValue ? characteristic_data.maxValue * 10 : 6500,
            "min": characteristic_data.minValue ? characteristic_data.minValue * 10 : 2700
          }
        }
      });
      break;
    case "Hue": // Lightbulb
    case "Saturation": // Lightbulb
      response.push({
        "type": "devices.capabilities.color_setting",
        "retrievable": true,
        "parameters": {
          "color_model": "hsv"
        }
      });
      break;
    case "Target Heating Cooling State": // Thermostat
      if (!characteristic_data.validValues) {
        // allowed modes are not specified, enable all
        response.push({
          "type": "devices.capabilities.on_off",
          "retrievable": true
        });
        response.push({
          "type": "devices.capabilities.mode",
          "retrievable": true,
          "parameters": {
            "instance": "thermostat",
            "modes": [{
              "value": "heat"
            }, {
              "value": "cool"
            }, {
              "value": "auto"
            }],
            "ordered": false
          }
        });
      } else {
        var modes = [];
        for (var i = 0; i < characteristic_data.validValues.length; i++) {
          switch (characteristic_data.validValues[i]) {
            case 0:
              //off
              response.push({
                "type": "devices.capabilities.on_off",
                "retrievable": true
              });
              break;
            case 1:
              modes.push({
                "value": "heat"
              });
              break;
            case 2:
              modes.push({
                "value": "cool"
              });
              break;
            case 3:
              modes.push({
                "value": "auto"
              });
              break;
          }
        }
        if (modes.length) {
          response.push({
            "type": "devices.capabilities.mode",
            "retrievable": true,
            "parameters": {
              "instance": "thermostat",
              "modes": modes,
              "ordered": false
            }
          });
        }
      }
      break;
    case "Target Temperature": // Thermostat
      response.push({
        "type": "devices.capabilities.range",
        "retrievable": true,
        "parameters": {
          "instance": "temperature",
          "unit": "unit.temperature.celsius",
          "range": {
            "min": characteristic_data.hasOwnProperty('minValue') ? characteristic_data.minValue : 10,
            "max": characteristic_data.hasOwnProperty('maxValue') ? characteristic_data.maxValue : 38,
            "precision": characteristic_data.hasOwnProperty('minStep') ? characteristic_data.minStep : 1,
          }
        }
      });
      break;
    case "Target Media State": // Television, Target Media State
      response.push({
        "type": "devices.capabilities.toggle",
        "retrievable": true,
        "parameters": {
          "instance": "pause"
        }
      });
      break;
    case "Mute": // Smart Speaker, Speaker, Television Speaker
      response.push({
        "type": "devices.capabilities.toggle",
        "retrievable": true,
        "parameters": {
          "instance": "mute"
        }
      });
      break;
    case "Volume": // Smart Speaker, Speaker, Television Speaker
      response.push({
        "type": "devices.capabilities.range",
        "retrievable": true,
        "parameters": {
          "instance": "volume",
          "unit": "unit.percent",
          "range": {
            "min": characteristic_data.hasOwnProperty('minValue') ? characteristic_data.minValue : 0,
            "max": characteristic_data.hasOwnProperty('maxValue') ? characteristic_data.maxValue : 100,
            "precision": characteristic_data.hasOwnProperty('minStep') ? characteristic_data.minStep : 1,
          }
        }
      });
      break;
    default:
      // unsupported characteristic_data.description
      break;
  }
  return response;
}

function lookupProperties(characteristic_data) {
  var response = [];
  switch (characteristic_data.description) {
    // float
    case "Current Temperature": // Heater Cooler, Temperature Sensor, Thermostat
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "temperature",
          "unit": "unit.temperature.celsius"
        }
      });
      break;
    case "Current Relative Humidity": // Humidifier Dehumidifier, Humidity Sensor, Thermostat
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "humidity",
          "unit": "unit.percent"
        }
      });
      break;
    case "PM10 Density": // Air Quality Sensor
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "pm10_density",
          "unit": "unit.density.mcg_m3"
        }
      });
      break;
    case "PM2.5 Density": // Air Quality Sensor
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "pm2.5_density",
          "unit": "unit.density.mcg_m3"
        }
      });
      break;
    case "VOC Density": // Air Quality Sensor
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "tvoc",
          "unit": "unit.density.mcg_m3"
        }
      });
      break;
    case "Carbon Dioxide Level": // Carbon Dioxide Sensor
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "co2_level",
          "unit": "unit.ppm"
        }
      });
      break;
    case "Current Ambient Light Level": // Light Sensor
      response.push({
        "type": "devices.properties.float",
        "retrievable": true,
        "parameters": {
          "instance": "illumination",
          "unit": "unit.illumination.lux"
        }
      });
      break;
      // binary
    case "Contact Sensor State": // Contact Sensor
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "open",
          "events": [{
            "value": "closed"
          }, {
            "value": "opened"
          }]
        }
      });
      break;
    case "Leak Detected": // Leak Sensor
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "water_leak",
          "events": [{
            "value": "dry"
          }, {
            "value": "leak"
          }]
        }
      });
      break;
    case "Motion Detected": // Motion Sensor
    case "Occupancy Detected": // Occupancy Sensor
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "motion",
          "events": [{
            "value": "not_detected"
          }, {
            "value": "detected"
          }]
        }
      });
      break;
    case "Smoke Detected": // Smoke Sensor
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "smoke",
          "events": [{
            "value": "not_detected"
          }, {
            "value": "detected"
          }]
        }
      });
      break;
    case "Programmable Switch Event": // Stateless Programmable Switch
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "button",
          "events": [{
            "value": "click"
          }, {
            "value": "double_click"
          }, {
            "value": "long_press"
          }]
        }
      });
      break;
    case "Status Low Battery":
      response.push({
        "type": "devices.properties.event",
        "retrievable": true,
        "parameters": {
          "instance": "battery_level",
          "events": [{
            "value": "normal"
          }, {
            "value": "low"
          }]
        }
      });
      break;
    default:
      // unsupported characteristic_data.description
      break;
  }
  return response;
}

function lookupDeviceType(service) {
  var category;
  switch (service.substr(0, 8)) {
    case "BB": // Air Purifier
      category = "devices.types.purifier";
      break;
    case "BC": // Heater Cooler
    case "4A": // Thermostat
      category = "devices.types.thermostat";
      break;
    case "BD": // Humidifier Dehumidifier
      category = "devices.types.humidifier";
      break;
    case "43": // Lightbulb
      category = "devices.types.light";
      break;
    case "47": // Outlet
      category = "devices.types.socket";
      break;
    case "49": // Switch
      category = "devices.types.switch";
      break;
    case "41": // Garage Door Opener
    case "45": // Lock Mechanism
    case "81": // Door
    case "8B": // Window
      category = "devices.types.openable";
      break;
    case "8C": // Window Covering
      category = "devices.types.openable.curtain";
      break;
    case "8A": // Temperature Sensor
    case "82": // Humidity Sensor
    case "8D": // Air Quality Sensor
    case "97": // Carbon Dioxide Sensor
      category = "devices.types.sensor.climate";
      break;
    case "84": // Light Sensor
      category = "devices.types.sensor.illumination";
      break;
    case "80": // Contact Sensor
      category = "devices.types.sensor.open";
      break;
    case "83": // Leak Sensor
      category = "devices.types.sensor.water_leak";
      break;
    case "85": // Motion Sensor
    case "86": // Occupancy Sensor
      category = "devices.types.sensor.motion";
      break;
    case "87": // Smoke Sensor
      category = "devices.types.sensor.smoke";
      break;
    case "89": // Stateless Programmable Switch
      category = "devices.types.sensor.button";
      break;
    case "40": // Fan
    case "B7": // Fanv2
    case "D7": // Faucet
    case "D0": // Valve
      category = "devices.types.other";
      break;
    case "28": // Smart Speaker
    case "13": // Television Speaker, Speaker
      category = "devices.types.media_device";
      break;
    case "D8": // Television
      category = "devices.types.media_device.tv";
      break;
    default:
      // No mapping exists
      // debug("No display category for %s using other", service.substr(0, 8));
      category = "devices.types.other";
      break;
  }
  return category;
}

function convertAliceValueToHomeBridgeValue(characteristic_data, request_capability_data) {
  switch (request_capability_data.type) {
    case "devices.capabilities.on_off":
      if (request_capability_data.state.instance == 'on') {
        if (characteristic_data.description == 'Target Door State' || characteristic_data.description == 'Lock Target State') {
          if (request_capability_data.state.value) {
            return {
              value: 0
            };
          } else {
            return {
              value: 1
            };
          }
        }
        if (request_capability_data.state.value) {
          return {
            value: characteristic_data.description == 'Target Position' ? 100 : 1
          };
        } else {
          return {
            value: 0
          };
        }
      }
      break;

    case "devices.capabilities.range":
      switch (request_capability_data.state.instance) {
        case 'brightness':
        case 'humidity':
        case 'volume':
        case 'open':
          if ((request_capability_data.state.value >= 0) || (request_capability_data.state.value <= 100)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        case 'temperature':
          if ((request_capability_data.state.value >= 10) || (request_capability_data.state.value <= 38)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        default:
          break;
      }
      break;

    case "devices.capabilities.mode":
      if (request_capability_data.state.instance == 'thermostat') {
        switch (request_capability_data.state.value) {
          case "auto":
            return {
              value: 3
            };
          case "cool":
            return {
              value: 2
            };
          case "heat":
            return {
              value: 1
            };
          default:
            break;
        }
      } else if (request_capability_data.state.instance == 'fan_speed') {
        switch (request_capability_data.state.value) {
          case "high":
            return {
              value: 100
            };
          case "medium":
            return {
              value: 60
            };
          case "low":
            return {
              value: 30
            };
          default:
            break;
        }
      }
      break;

    case "devices.capabilities.color_setting":
      if (request_capability_data.state.instance == 'hsv') {
        if (characteristic_data.description == "Hue") {
          return {
            value: request_capability_data.state.value.h
          };
        } else if (characteristic_data.description == "Saturation") {
          return {
            value: request_capability_data.state.value.s
          };
        }
      } else if (request_capability_data.state.instance == 'temperature_k') {
        return {
          value: request_capability_data.state.value / 10
        };
      }
      break;

    case "devices.capabilities.toggle":
      if (request_capability_data.state.value) {
        return {
          value: 1
        };
      } else {
        return {
          value: 0
        };
      }
      break;

    default:
      break;
  }

  return {
    error_code: "INVALID_VALUE",
    error_message: "Requested value is not valid for requested capability"
  };
}

function convertHomeBridgeValueToAliceValue(capability_data, characteristic_data) {
  var converted_capability_data = {
    type: capability_data.type,
    state: {}
  }
  switch (capability_data.type) {
    case "devices.capabilities.on_off":
      converted_capability_data.state.instance = "on";
      if (characteristic_data.description == 'Target Door State' || characteristic_data.description == 'Lock Target State') {
        if (characteristic_data.value) {
          converted_capability_data.state.value = false;
        } else {
          converted_capability_data.state.value = true;
        }
        return converted_capability_data;
      }
      if (characteristic_data.value) {
        converted_capability_data.state.value = true;
      } else {
        converted_capability_data.state.value = false;
      }
      return converted_capability_data;
    case "devices.capabilities.toggle":
      converted_capability_data.state.instance = capability_data.parameters.instance;
      if (characteristic_data.value) {
        converted_capability_data.state.value = true;
      } else {
        converted_capability_data.state.value = false;
      }
      return converted_capability_data;
    case "devices.capabilities.range":
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        converted_capability_data.state.value = characteristic_data.value;
        return converted_capability_data;
      }
      break;

    case "devices.capabilities.mode":
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        if (capability_data.parameters.instance == 'thermostat') {
          switch (characteristic_data.value) {
            case 3:
              converted_capability_data.state.value = "auto";
              return converted_capability_data;

            case 2:
              converted_capability_data.state.value = "cool";
              return converted_capability_data;
            case 1:
              converted_capability_data.state.value = "heat";
              return converted_capability_data;
            case 0:
              converted_capability_data.state.value = capability_data.parameters.modes[0].value;
              return converted_capability_data;
            default:
              break;
          }
        } else if (capability_data.parameters.instance == 'fan_speed') {
          switch (true) {
            case (characteristic_data.value > 66):
              converted_capability_data.state.value = "high";
              return converted_capability_data;
            case (characteristic_data.value < 33):
              converted_capability_data.state.value = "low";
              return converted_capability_data;
            default:
              converted_capability_data.state.value = "medium";
              return converted_capability_data;
              break;
          }
        }
      }
      break;
    case "devices.capabilities.color_setting":
      if (capability_data.parameters && capability_data.parameters.color_model) {
        converted_capability_data.state.instance = capability_data.parameters.color_model;
        converted_capability_data.state.value = {};
        converted_capability_data.state.value.v = 100;
        if (characteristic_data.description == "Hue")
          converted_capability_data.state.value.h = characteristic_data.value;
        else if (characteristic_data.description == "Saturation")
          converted_capability_data.state.value.s = characteristic_data.value;
        return converted_capability_data;
      } else if (capability_data.parameters && capability_data.parameters.temperature_k) {
        converted_capability_data.state.instance = "temperature_k";
        converted_capability_data.state.value = characteristic_data.value * 10;
        return converted_capability_data;
      }
      break;
    case "devices.properties.float":
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        converted_capability_data.state.value = characteristic_data.value;
        return converted_capability_data;
      }
      break;
    case "devices.properties.event":
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        if (capability_data.parameters.instance == "open")
          converted_capability_data.state.value = characteristic_data.value ? "opened" : "closed";
        else if (capability_data.parameters.instance == "water_leak")
          converted_capability_data.state.value = characteristic_data.value ? "leak" : "dry";
        else if (capability_data.parameters.instance == "motion" || capability_data.parameters.instance == "smoke")
          converted_capability_data.state.value = characteristic_data.value ? "detected" : "not_detected";
        else if (capability_data.parameters.instance == "battery_level")
          converted_capability_data.state.value = characteristic_data.value ? "low" : "normal";
        else if (capability_data.parameters.instance == "button") {
          switch (characteristic_data.value) {
            case 2:
              converted_capability_data.state.value = "long_press";
              return converted_capability_data;
            case 1:
              converted_capability_data.state.value = "long_press";
              return converted_capability_data;
            case 0:
              converted_capability_data.state.value = "click";
              return converted_capability_data;
            default:
              break;
          }
        }
        return converted_capability_data;
      }
      break;
    default:
      break;
  }

  return {
    error_code: "INTERNAL_ERROR",
    error_message: "Couldn't convert device capability value for Alice"
  };
}
