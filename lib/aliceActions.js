var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var Homebridges = require('./parse/Homebridges.js').Homebridges;
var debug = require('debug')('aliceActions');
var aliceLocal = require('./aliceLocal.js');
var messages = require('./parse/messages.js');

var homebridge;
var notiData = [];
var notiDataTMR;
var notiOption;

module.exports = {
  aliceDiscovery: aliceDiscovery,
  aliceEvent: aliceEvent,
  aliceAction: aliceAction,
  aliceQuery: aliceQuery,
  registerNotifies: registerNotifies,
  hapDiscovery: hapDiscovery
};

function hapDiscovery(options) {
  homebridge = new HAPNodeJSClient(options);
  notiOption = options.notifies;

  homebridge.on('Ready', function() {
    aliceDiscovery.call(options, null, function() {
      // debug("options", options);
    });
  });
  homebridge.on('hapEvent', function(event) {
    options.eventBus.emit('hapEvent', event);
  });
}

function aliceDiscovery(message, callback) {
  // debug('aliceDiscovery', this);
  homebridge.HAPaccessories(function(endPoints) {
    debug("aliceDiscovery");
    var response;
    var hbDevices = new Homebridges(endPoints, this);
    response = hbDevices.getDevicesAndCapabilities(message);
    debug("response", response);

    // debug("RESPONSE", JSON.stringify(response));
    if (response && response.payload.devices.length < 1) {
      this.log("ERROR: HAP Discovery failed, please review config");
    } else {
      this.log("aliceDiscovery - returned %s devices", response.payload.devices.length);
    }
    if (notiOption) {
      var dataNotifies = hbDevices.onNotifies();
      for (var i = 0; i < dataNotifies.length; i++) {
        registerNotifies(dataNotifies[i].deviceID, '{"characteristics":' + JSON.stringify(dataNotifies[i].characteristics) + '}')
      }
      for (var i = 0; i < response.payload.devices.length; i++) {
        var device_data = response.payload.devices[i];
        if (device_data.hasOwnProperty("capabilities"))
          for (var j = 0; j < device_data.capabilities.length; j++) device_data.capabilities[j].reportable = true;
        if (device_data.hasOwnProperty("properties"))
          for (var j = 0; j < device_data.properties.length; j++) device_data.properties[j].reportable = true;
      }
    }
    // debug("Discovery Response", JSON.stringify(response, null, 4));
    callback(null, response);
  }.bind(this));
}

function aliceAction(message, callback) {
  var response = {
    payload: {
      devices : []
    }
  };

  if (message && message.hasOwnProperty('request_id')) {
    response.request_id = message.request_id;
  }

  var command_body = {
    "characteristics": []
  };

  var command_params = {};

  try {
    if (message.payload.devices.length == 0) {
      throw new Error('device array is empty');
    }
    homebridge.HAPaccessories(function(endPoints) {
      var hbDevices = new Homebridges(endPoints, this);

      for(var i = 0; i < message.payload.devices.length; i++) {
        var device_data = message.payload.devices[i];
        var dev_status = hbDevices.checkThatDeviceExists(device_data.id);

        if (dev_status.error_code) {
          this.log(dev_status.error_message, device_data);
          response.payload.devices.push({
            id: device_data.id,
            error_code: dev_status.error_code,
            error_message: dev_status.error_message
          });
          continue;
        }

        var response_device_body = {
          id: device_data.id,
          capabilities: []
        };

        if (!command_params.host || !command_params.port) {
          command_params.host = dev_status.homebridge.host;
          command_params.port = dev_status.homebridge.port;
        }

        if (device_data.capabilities.length == 0) {
          throw new Error('device id ' +  + ' capabilities array is empty');
        }

        for(var j = 0; j < device_data.capabilities.length; j++) {
          var capability_data = device_data.capabilities[j];
          var cap_status_arr = dev_status.service.getCharacteristicIidAndValueFromCapability(capability_data);

          for (var k = 0; k < cap_status_arr.length; k++) {
            cap_status = cap_status_arr[k];
            if (cap_status.error_code) {
              // something went wrong
              this.log(cap_status.error_message, capability_data.type);
              response_device_body.capabilities.push({
                type: capability_data.type,
                state: {
                  instance: capability_data.state.instance,
                  action_result: {
                    status: "ERROR",
                    error_code: cap_status.error_code,
                    error_message: cap_status.error_message
                  }
                }
              });
              continue;
            }

            command_body.characteristics.push({
              "aid": cap_status.aid,
              "iid": cap_status.iid,
              "value": cap_status.value
            });
          }

          response_device_body.capabilities.push({
            type: capability_data.type,
            state: {
              instance: capability_data.state.instance,
              action_result: {
                status: "DONE"
              }
            }
          });
        }

        response.payload.devices.push(response_device_body);
      }
      
      if(command_body.characteristics.length < 1) {
        // no valid device commands were found
        callback(null,response);
        return;
      }

      var devicesHBName = hbDevices.getDevicesHBName(message.payload.devices);
      var currentEndpoint = endPoints.find(function (endpoint) {
        // Compare endpoint homebridge name and current hb_name 
        return devicesHBName.includes(endpoint.instance.name)
      })

      if (!currentEndpoint) {
        this.log("Cannot find the current endpoint")
        callback(null,response);
        return;
      }
  
      homebridge.HAPcontrolByDeviceID(currentEndpoint.instance.deviceID, JSON.stringify(command_body), function(err, status) {
        this.log("Action", currentEndpoint.instance.deviceID, JSON.stringify(command_body), status, err);
        if (err) {
          for(var i = 0; i < response.payload.devices.length; i++) {
            for(var j = 0; j < response.payload.devices[i].capabilities.length; j++) {
              var capability_response = response.payload.devices[i].capabilities[j];
              if (capability_response.state.action_result.status == "DONE") {
                capability_response.state.action_result = {
                  status: "ERROR",
                  error_code: "INTERNAL_ERROR",
                  error_message: err.message
                };
              }
            }
          }
        }
  
        callback(null,response);
      }.bind(this));
    }.bind(this));
  } catch(e) {
    // probably JSON does not have those fields.
    this.log("error with action JSON data", e.message);
    callback(e, {
      "payload": {
        "error_code": 400, // bad request data
        "error_message": e.message
      }
    });
  }
}


function aliceQuery(message, callback) {
  var response = {
    payload: {
      devices : []
    }
  };

  if (message && message.hasOwnProperty('request_id')) {
    response.request_id = message.request_id;
  }
  try {
    if (message.devices.length == 0) {
      throw new Error('device array is empty');
    }
    homebridge.HAPaccessories(function(endPoints) {
      var hbDevices = new Homebridges(endPoints, this);
      var devicesHBName = hbDevices.getDevicesHBName(message.devices);
      var currentEndpoint = endPoints.find(function(endpoint) {
        // Compare endpoint homebridge name and current hb_name 
        return devicesHBName.includes(endpoint.instance.name)
      })

      for (var i = 0; i < message.devices.length; i++) {
        var device_data = message.devices[i];
        var dev_status = hbDevices.checkThatDeviceExists(device_data.id);

        if (dev_status.error_code) {
          debug(dev_status.error_message, device_data);
          response.payload.devices.push({
            id: device_data.id,
            error_code: dev_status.error_code,
            error_message: dev_status.error_message
          });
          continue;
        }

        response.payload.devices.push(dev_status.service.getDeviceState(homebridge, currentEndpoint.instance.deviceID));
      }

      Promise.all(response.payload.devices).then((result) => {
        response.payload.devices = result;
        callback(null, response);
      });
    }.bind(this));
  } catch(e) {
    // probably JSON does not have those fields.
    debug("error with action JSON data", e.message);
    callback(e, {
      "payload": {
        "error_code": 400, // bad request data
        "error_message": e.message
      }
    });
  }
}

function aliceEvent(message, callback) {
  homebridge.HAPaccessories(function(endPoints) {
    var hbDevices = new Homebridges(endPoints, this);
    var response = {
      payload: {}
    };

    for (var i = 0; i < message.length; i++) {
      var device_data = {};
      if (!message[i].hasOwnProperty("value")) continue;
      var dev_status = hbDevices.checkThatDeviceExistsNoti(message[i]);
      if (dev_status.error_code) {
        continue;
      }

      device_data.id = dev_status.service.id;
      for (var j = 0; j < dev_status.characteristic.capabilities.length; j++) {
        var capability_data = dev_status.characteristic.capabilities[j];
        var converted_capability_state = messages.convertHomeBridgeValueToAliceValue(capability_data, dev_status.characteristic);
        if (converted_capability_state.error_code) continue;
        if (!device_data.hasOwnProperty("capabilities")) device_data.capabilities = [];
        device_data.capabilities.push(converted_capability_state);
      }

      for (var j = 0; j < dev_status.characteristic.properties.length; j++) {
        var propertie_data = dev_status.characteristic.properties[j];
        var converted_capability_state = messages.convertHomeBridgeValueToAliceValue(propertie_data, dev_status.characteristic);
        if (converted_capability_state.error_code) continue;
        if (!device_data.hasOwnProperty("properties")) device_data.properties = [];
        device_data.properties.push(converted_capability_state);
      }

      if (notiData.length) {
        var notiDataIndex = notiData.findIndex(data => data.id == device_data.id);

        if (notiDataIndex !== -1) {
          if (device_data.hasOwnProperty("capabilities")) {
            for (var j = 0; j < device_data.capabilities.length; j++) {
              var capability_data = device_data.capabilities[j];
              if (notiData[notiDataIndex].hasOwnProperty("capabilities") && notiData[notiDataIndex].capabilities.length) {
                var capability_index = notiData[notiDataIndex].capabilities.findIndex(data => data.type === capability_data.type && data.state.instance == capability_data.state.instance);
                if (capability_index !== -1) notiData[notiDataIndex].capabilities.splice(capability_index, 1);
              } else notiData[notiDataIndex].capabilities = [];
              notiData[notiDataIndex].capabilities.push(capability_data);
            }
          }

          if (device_data.hasOwnProperty("properties")) {
            for (var j = 0; j < device_data.properties.length; j++) {
              var propertie_data = device_data.properties[j];
              if (notiData[notiDataIndex].hasOwnProperty("properties") && notiData[notiDataIndex].properties.length) {
                var propertie_index = notiData[notiDataIndex].properties.findIndex(data => data.type === propertie_data.type && data.state.instance == propertie_data.state.instance);
                if (propertie_index !== -1) notiData[notiDataIndex].properties.splice(propertie_index, 1);
              } else notiData[notiDataIndex].properties = [];
              notiData[notiDataIndex].properties.push(propertie_data);
            }
          }
        } else notiData.push(device_data);
      } else notiData.push(device_data);
    }

    if (!notiDataTMR && notiData.length) {
      response.payload.devices = notiData;
      aliceLocal.aliceEvent(response);
      notiData = [];
      notiDataTMR = setTimeout(function() {
        if (notiData.length) {
          response.payload.devices = notiData;
          aliceLocal.aliceEvent(response);
          notiData = [];
        }
        notiDataTMR = false;
      }, 2 * 1000);
    }
  }.bind(this));
}

function registerNotifies(deviceID, data) {
  homebridge.HAPeventByDeviceID(deviceID, data, function(err, status) {});
}