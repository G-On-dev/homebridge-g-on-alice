const HAPNodeJSClient = require("hap-node-client").HAPNodeJSClient;
const Homebridges = require("./parse/Homebridges.js");
const debug = require("debug")("aliceActions");

class AliceAction {
  constructor(options) {
    this.options = options;
    this.log = options.log;
    this.client = null;
    this.homebridges = null;
    this.aliceDevices = { payload: { devices: [] } };
    this._homebridges = null;

    this.hapDiscovery();
  }

  hapDiscovery() {
    this.client = new HAPNodeJSClient({ ...this.options, refresh: 20, timeout: 15, reqTimeout: 7000, filter: false });

    this.client.on("Ready", this.discoveredHomebridges.bind(this));
  }

  discoveredHomebridges(homebridges) {
    this._homebridges = homebridges;
    this.homebridges = new Homebridges(homebridges, this);
    this.aliceDevices = this.homebridges.getDevicesAndCapabilities({});
  }

  async aliceDiscovery({ msg: message, topic_params }) {
    if (this.aliceActions.aliceDevices && this.aliceActions.aliceDevices.payload.devices.length < 1) {
      this.log("ERROR: HAP Discovery failed, please review config");
    } else {
      this.log("aliceDiscovery - returned %s devices", this.aliceActions.aliceDevices.payload.devices.length);
    }

    this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, this.aliceActions.aliceDevices);
  }

  aliceAction({ msg: message, topic_params }) {
    const response = {
      payload: {
        devices: [],
      },
    };

    if (message && message.hasOwnProperty("request_id")) {
      response.request_id = message.request_id;
    }

    const command_body = {
      characteristics: [],
    };

    const command_params = {};

    try {
      if (message.payload.devices.length == 0) {
        throw new Error("device array is empty");
      }

      for (let i = 0; i < message.payload.devices.length; i++) {
        const device_data = message.payload.devices[i];

        const deviceStatus = this.aliceActions.homebridges.checkThatDeviceExists(device_data.id);

        if (deviceStatus.error_code) {
          this.log(deviceStatus.error_message, device_data);
          response.payload.devices.push({
            id: device_data.id,
            error_code: deviceStatus.error_code,
            error_message: deviceStatus.error_message,
          });
          continue;
        }

        const response_device_body = {
          id: device_data.id,
          capabilities: [],
        };

        if (!command_params.host || !command_params.port) {
          command_params.host = deviceStatus.homebridge.host;
          command_params.port = deviceStatus.homebridge.port;
        }

        if (device_data.capabilities.length == 0) {
          throw new Error("device id " + +" capabilities array is empty");
        }

        for (let j = 0; j < device_data.capabilities.length; j++) {
          const capability_data = device_data.capabilities[j];
          const cap_status = deviceStatus.service.getCharacteristicIidAndValueFromCapability(capability_data);

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
                  error_message: cap_status.error_message,
                },
              },
            });
            continue;
          }

          command_body.characteristics.push({
            aid: cap_status.aid,
            iid: cap_status.iid,
            value: cap_status.value,
          });

          response_device_body.capabilities.push({
            type: capability_data.type,
            state: {
              instance: capability_data.state.instance,
              action_result: {
                status: "DONE",
              },
            },
          });
        }

        response.payload.devices.push(response_device_body);
      }

      if (command_body.characteristics.length < 1) {
        // no valid device commands were found
        this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, response);
        return;
      }

      const devicesHBName = this.aliceActions.homebridges.getDevicesHBName(message.payload.devices);
      const currentEndpoint = this.aliceActions._homebridges.find(function (endpoint) {
        // Compare endpoint homebridge name and current hb_name
        return devicesHBName.includes(endpoint.instance.name);
      });

      if (!currentEndpoint) {
        this.log("Cannot find the current endpoint");
        this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, response);
        return;
      }

      this.aliceActions.client.HAPcontrolByDeviceID(currentEndpoint.instance.deviceID, JSON.stringify(command_body), (err, status) => {
        this.log("Action", currentEndpoint.instance.deviceID, JSON.stringify(command_body), status, err);
        if (err) {
          for (let i = 0; i < response.payload.devices.length; i++) {
            for (let j = 0; j < response.payload.devices[i].capabilities.length; j++) {
              const capability_response = response.payload.devices[i].capabilities[j];
              if (capability_response.state.action_result.status == "DONE") {
                capability_response.state.action_result = {
                  status: "ERROR",
                  error_code: "INTERNAL_ERROR",
                  error_message: err.message,
                };
              }
            }
          }
        }

        this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, response);
      });
    } catch (e) {
      this.log("error with action JSON data", e.message);

      this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, {
        payload: {
          error_code: 400,
          error_message: e.message,
        },
      });
    }
  }

  aliceQuery({ msg: message, topic_params }) {
    const response = {
      payload: {
        devices: [],
      },
    };

    if (message && message.hasOwnProperty("request_id")) {
      response.request_id = message.request_id;
    }
    try {
      if (message.devices.length == 0) {
        throw new Error("device array is empty");
      }

      for (let i = 0; i < message.devices.length; i++) {
        const device_data = message.devices[i];
        const deviceStatus = this.aliceActions.homebridges.checkThatDeviceExists(device_data.id);

        if (deviceStatus.error_code) {
          debug(deviceStatus.error_message, device_data);
          response.payload.devices.push({
            id: device_data.id,
            error_code: deviceStatus.error_code,
            error_message: deviceStatus.error_message,
          });
          continue;
        }

        response.payload.devices.push(deviceStatus.service.getDeviceState());
      }

      this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, response);
    } catch (e) {
      this.log("error with action JSON data", e.message);

      this.aliceLocal.publish(`response/${this.username}/${topic_params.request}`, {
        payload: {
          error_code: 400,
          error_message: e.message,
        },
      });
    }
  }
}

module.exports = AliceAction;
