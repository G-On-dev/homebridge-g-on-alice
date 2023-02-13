var debug = require("debug")("messages");

module.exports = {
  lookupCapabilities: lookupCapabilities,
  lookupDeviceType: lookupDeviceType,
  convertAliceValueToHomeBridgeValue: convertAliceValueToHomeBridgeValue,
  convertHomeBridgeValueToAliceValue: convertHomeBridgeValueToAliceValue,
};

function lookupCapabilities(characteristic_data) {
  var response = [];

  switch (characteristic_data.description) {
    case "Target Heating Cooling State":
      if (!characteristic_data.validValues) {
        // allowed modes are not specified, enable all
        response.push({
          type: "devices.capabilities.on_off",
          retrievable: true,
        });
        response.push({
          type: "devices.capabilities.mode",
          retrievable: true,
          parameters: {
            instance: "thermostat",
            modes: [
              {
                value: "heat",
              },
              {
                value: "cool",
              },
              {
                value: "auto",
              },
            ],
            ordered: false,
          },
        });
      } else {
        var modes = [];
        for (var i = 0; i < characteristic_data.validValues.length; i++) {
          switch (characteristic_data.validValues[i]) {
            case 0:
              //off
              response.push({
                type: "devices.capabilities.on_off",
                retrievable: true,
              });
              break;
            case 1:
              modes.push({
                value: "heat",
              });
              break;
            case 2:
              modes.push({
                value: "cool",
              });
              break;
            case 3:
              modes.push({
                value: "auto",
              });
              break;
          }
        }
        if (modes.length) {
          response.push({
            type: "devices.capabilities.mode",
            retrievable: true,
            parameters: {
              instance: "thermostat",
              modes: modes,
              ordered: false,
            },
          });
        }
      }
      break;
    case "Target Temperature":
      response.push({
        type: "devices.capabilities.range",
        retrievable: true,
        parameters: {
          instance: "temperature",
          unit: "unit.temperature.celsius",
          range: {
            min: 10,
            max: 38,
            precision: 1,
          },
        },
      });
      break;
    case "Rotation Speed": // RotationSpeed
    case "Brightness": // Brightness
      response.push({
        type: "devices.capabilities.range",
        retrievable: true,
        parameters: {
          instance: "brightness",
          unit: "unit.percent",
          range: {
            min: 0,
            max: 100,
            precision: 1,
          },
        },
      });
      break;
    case "Hue": // Hue
      response.push({
        type: "devices.capabilities.color_setting",
        retrievable: true,
        parameters: {
          color_model: "rgb",
        },
      });
      break;
    case "Target Position":
      response.push({
        type: "devices.capabilities.range",
        retrievable: true,
        parameters: {
          instance: "open",
          unit: "unit.percent",
          range: {
            min: 0,
            max: 100,
            precision: 10,
          },
        },
      });
      break;
    case "Active": // Active on a Fan 2 aka Dyson or Valve
    case "Target Door State":
    case "On":
      response.push({
        type: "devices.capabilities.on_off",
        retrievable: true,
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
    case "113": // SPEAKER
      category = "devices.types.media_device";
      break;
    case "D8": // Service "Television"
    case "98": // TV
      category = "devices.types.media_device.tv";
      break;
    case "43": // lightbulb
      category = "devices.types.light";
      break;
    case "8C": // Window Covering
      category = "devices.types.openable.curtain";
      break;
    case "40": // Fan
    case "B7": // Fan2
    case "D0": // Valve / Sprinkler
      category = "devices.types.other";
      break;
    case "41": // Garage Door
      category = "devices.types.other";
      break;
    case "45": // Garage Door
      category = "devices.types.other";
      break;
    case "47":
      // Outlet
      category = "devices.types.socket";
      break;
    case "49":
      // Switch
      category = "devices.types.switch";
      break;
    case "8A":
      category = "devices.types.other";
      break;
    case "80":
      category = "devices.types.other";
      break;
    case "85":
      category = "devices.types.other";
      break;
    case "4A":
    case "BC":
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
      if (request_capability_data.state.instance == "on") {
        if (request_capability_data.state.value) {
          return {
            value: 1,
          };
        } else {
          return {
            value: 0,
          };
        }
      }
      break;

    case "devices.capabilities.color_setting":
      if (request_capability_data.state.instance == "rgb") {
        const hexToRgbA = (val) => {
          var r = val & 0xff;
          var g = (val >> 8) & 0xff;
          var b = (val >> 16) & 0xff;
          var a = (val >> 24) & 0xff;
          return [b, g, r];
        };

        const rgbToHsv = (r, g, b) => {
          let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
          rabs = r / 255;
          gabs = g / 255;
          babs = b / 255;
          (v = Math.max(rabs, gabs, babs)), (diff = v - Math.min(rabs, gabs, babs));
          diffc = (c) => (v - c) / 6 / diff + 1 / 2;
          percentRoundFn = (num) => Math.round(num * 100) / 100;
          if (diff == 0) {
            h = s = 0;
          } else {
            s = diff / v;
            rr = diffc(rabs);
            gg = diffc(gabs);
            bb = diffc(babs);

            if (rabs === v) {
              h = bb - gg;
            } else if (gabs === v) {
              h = 1 / 3 + rr - bb;
            } else if (babs === v) {
              h = 2 / 3 + gg - rr;
            }
            if (h < 0) {
              h += 1;
            } else if (h > 1) {
              h -= 1;
            }
          }
          return {
            h: Math.round(h * 360),
            s: percentRoundFn(s * 100),
            v: percentRoundFn(v * 100),
          };
        };

        const rgba = hexToRgbA(request_capability_data.state.value);
        const hsv = rgbToHsv(...rgba);

        if (request_capability_data.state.value) {
          return {
            value: hsv.h,
          };
        }
      }
      break;

    case "devices.capabilities.range":
      switch (request_capability_data.state.instance) {
        case "brightness":
        case "open":
          if (request_capability_data.state.value >= 0 || request_capability_data.state.value <= 100) {
            return {
              value: request_capability_data.state.value,
            };
          }
          break;

        case "temperature":
          if (request_capability_data.state.value >= 10 || request_capability_data.state.value <= 38) {
            return {
              value: request_capability_data.state.value,
            };
          }
          break;

        default:
          break;
      }
      break;

    case "devices.capabilities.mode":
      if (request_capability_data.state.instance == "thermostat") {
        switch (request_capability_data.state.value) {
          case "auto":
            return {
              value: 3,
            };

          case "cool":
            return {
              value: 2,
            };

          case "heat":
            return {
              value: 1,
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
    error_message: "Requested value is not valid for requested capability",
  };
}

function convertHomeBridgeValueToAliceValue(capability_data, characteristic_data) {
  var converted_capability_data = {
    type: capability_data.type,
    state: {},
  };
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

    case "devices.capabilities.color_setting":
      if (capability_data.parameters && capability_data.parameters.color_model) {
        converted_capability_data.state.instance = capability_data.parameters.color_model;
        const HSVtoRGB = (hsb) => {
          let rgb = [];
          for (let offset = 240, i = 0; i < 3; i++, offset -= 120) {
            let x = Math.abs(((hsb[0] + offset) % 360) - 240);
            if (x <= 60) rgb[i] = 255;
            else if (60 < x && x < 120) rgb[i] = (1 - (x - 60) / 60) * 255;
            else rgb[i] = 0;
          }
          for (let i = 0; i < 3; i++) rgb[i] += (255 - rgb[i]) * (1 - hsb[1]);
          for (let i = 0; i < 3; i++) rgb[i] *= hsb[2];
          for (let i = 0; i < 3; i++) rgb[i] = Math.round(rgb[i]);
          return rgb;
        };

        const rbg = HSVtoRGB([characteristic_data.value, 1, 1]);
        let argb = rbg[0] * 65536 + rbg[1] * 256 + rbg[2];

        converted_capability_data.state.value = argb;

        return converted_capability_data;
      }

    case "devices.capabilities.mode":
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
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
    error_message: "Couldn't convert device capability value for Alice",
  };
}
