var debug = require('debug')('messages');

module.exports = {
  lookupCapabilities: lookupCapabilities,
  lookupDeviceType: lookupDeviceType,
  convertAliceValueToHomeBridgeValue: convertAliceValueToHomeBridgeValue,
  convertHomeBridgeValueToAliceValue: convertHomeBridgeValueToAliceValue
};

function lookupCapabilities(characteristic_data) {
  var response = [];

  switch (characteristic_data.description) {
    case "Target Heating Cooling State":
      if (!characteristic_data.validValues) {
        // allowed modes are not specified, enable all
        response.push({
          "type": "devices.capabilities.on_off"
        });
        response.push({
          "type": "devices.capabilities.mode",
          "parameters": {
              "instance": "thermostat",
              "modes": [
                {
                  "value": "heat"
                },
                {
                  "value": "cool"
                },
                {
                  "value": "auto"
                }
              ],
              "ordered": false
          }
        });
      } else {
        var modes = [];
        for(var i = 0; i < characteristic_data.validValues.length; i++) {
          switch(characteristic_data.validValues[i]) {
            case 0:
              //off
              response.push({
                "type": "devices.capabilities.on_off"
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
            "parameters": {
                "instance": "thermostat",
                "modes": modes,
                "ordered": false
            }
          });
        }
      }
      break;
    case "Target Temperature":
      response.push({
        "type": "devices.capabilities.range",
        "parameters": {
            "instance": "temperature",
            "unit": "unit.temperature.celsius",
            "range": {
                "min": 10,
                "max": 38,
                "precision": 1
            }
        }
      });
      break;
    case "Rotation Speed": // RotationSpeed
    case "Brightness": // Brightness
      response.push({
        "type": "devices.capabilities.range",
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
    case "Target Position":
      response.push({
        "type": "devices.capabilities.range",
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
    case "Active": // Active on a Fan 2 aka Dyson or Valve
    case "Target Door State":
    case "On":
      response.push({
        "type": "devices.capabilities.on_off"
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
    case "00000113": // SPEAKER
      category = "devices.types.media_device";
      break;
    case "000000D8": // Service "Television"
    case "00000098": // TV
      category = "devices.types.media_device.tv";
      break;
    case "00000043": // lightbulb
      category = "devices.types.light";
      break;
    case "0000008C": // Window Covering
    case "00000040": // Fan
    case "000000B7": // Fan2
    case "000000D0": // Valve / Sprinkler
      category = "devices.types.other";
      break;
    case "00000041": // Garage Door
      category = "devices.types.other";
      break;
    case "00000045": // Garage Door
      category = "devices.types.other";
      break;
    case "00000047":
      // Outlet
      category = "devices.types.socket";
      break;
    case "00000049":
      // Switch
      category = "devices.types.switch";
      break;
    case "0000008A":
      category = "devices.types.other";
      break;
    case "00000080":
      category = "devices.types.other";
      break;
    case "00000085":
      category = "devices.types.other";
      break;
    case "0000004A":
    case "000000BC":
      category = "devices.types.thermostat";
      break;
    default:
      // No mapping exists
      // debug("No display category for %s using other", service.substr(0, 8));
      category = "devices.types.other";
      break;
  }
  return category;
}

function convertAliceValueToHomeBridgeValue(request_capability_data) {
  switch (request_capability_data.type) {
    case "devices.capabilities.on_off":
      if (request_capability_data.state.instance == 'on') {
        if (request_capability_data.state.value) {
          return {
            value: 1
          };
        } else {
          return {
            value: 0
          };
        }
      }
      break;

    case "devices.capabilities.range":
      switch(request_capability_data.state.instance) {
        case 'brightness':
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
          switch(request_capability_data.state.value) {
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
          switch(characteristic_data.value) {
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
                converted_capability_data.state.value = "off";
                return converted_capability_data;

            default:
              break;
          }
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
