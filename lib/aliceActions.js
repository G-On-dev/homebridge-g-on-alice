var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var Homebridges = require('./parse/Homebridges.js').Homebridges;
var debug = require('debug')('aliceActions');

var homebridge;

module.exports = {
  aliceDiscovery: aliceDiscovery,
  aliceAction: aliceAction,
  aliceQuery: aliceQuery,
  hapDiscovery: hapDiscovery
};

function hapDiscovery(options) {
  homebridge = new HAPNodeJSClient(options);

  homebridge.on('Ready', function() {
    aliceDiscovery.call(options, null, function() {
      // debug("options", options);
    });
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
          var cap_status = dev_status.service.getCharacteristicIidAndValueFromCapability(capability_data);

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

      homebridge.HAPcontrol(command_params.host, command_params.port, JSON.stringify(command_body), function(err, status) {
        this.log("Action", capability_data.state.instance, command_params.host, command_params.port, status, err);
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
      
      for(var i = 0; i < message.devices.length; i++) {
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

        response.payload.devices.push(dev_status.service.getDeviceState());
      }
      
      callback(null,response);
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
