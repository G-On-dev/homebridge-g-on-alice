**homebridge-g-on-alice**

Enable Yandex Alice access and control your homebridge controlled devices and accessories. Supports Alice on Smartphone, PC, Yandex Station and other Yandex devices.

# Features

* Supports one HomeBridge, running on the same host as this plugin
* Supports the following HomeKit accessory types: Lightbulb, Outlet, Switch, Fan and Thermostat.
* This plugin does not have any devices or accessories that are visible from Homekit, and does not need to be added on the Home app.

# Supported devices

* Support for Light Bulbs, Switches and outlets
* Support for Thermostats
* Support for Color Light Bulbs and Colour Temperature of white Light bulbs (not yet)
* Support for Fans (not tested yet)
* Support for Garage Doors
* Support up to 100 accessories

Alice device names are the same as the homebridge device names.

This only supports accessories connected via a homebridge plugin, any 'Homekit' accessories are not supported.

## HomeKit/Homebridge Devices supported

### Native Support

* Lightbulbs, outlets and switches
* Dimmable lightbulbs, outlets and switches
* Colour lightbulbs (not yet)
* Thermostat
* Heater/Cooler

## Unsupported device types

* Camera's
* Eve devices
* Security Systems
* Audio and playback systems

# Alice Voice Commands

## Light bulbs / Switches / Dimmer Switches

* Алиса, включи *device*
* Алиса, выключи *device*

* Алиса, установи яркость *device* на минимум
* Алиса, прибавь яркость *device* 

## Thermostat's and Heater / Cooler's

* Алиса, установи температуру *device* на 20 градусов.
* Алиса, переведи *device* в режим охлаждения/нагрева.

# Installation of homebridge-g-on-alice

* If you are looking for a basic setup to get this plugin up and running check out this guide (https://homebridge.g-on.io/setup).

## Install Plugin

2. The setup of homebridge-g-on-alice is similar to other plugins, except it doesn't have any devices in the Home app.

```
sudo npm install -g git+https://github.com/G-On-dev/homebridge-g-on-alice.git
```

## Create homebridge-g-on-alice account

3. An account to link your Yandex Alice to HomeBridge needs to created on this website https://homebridge.g-on.io/.  This account will be used when you enable the home skill in the Yandex App on your mobile, and in the configuration of the plugin in homebridge.


## HomeBridge-g-on-alice plugin configuration

4. Add the plugin to your config.json.  The login and password in the config.json, are the credentials you created earlier for the https://homebridge.g-on.io/ website.  This only needs to be completed for one instance of homebridge in your environment, it will discover the accessories connected to your other homebridges automatically.

```
"platforms": [
  {
    "platform": "G-On Alice",
    "name": "G-On Alice",
    "username": "....",
    "password": "...."
  }
],
```

### Required parameters

* username - Login created for the skill linking website https://homebridge.g-on.io/
* password - Login created for the skill linking website https://homebridge.g-on.io/

### Optional parameters

* pin - If you had changed your homebridge pin from the default of "pin": "031-45-154" ie

```
"platforms": [
  {
    "platform": "G-On Alice",
    "name": "G-On Alice",
    "username": "....",
    "password": "....",
    "pin": "031-45-155"
  }
],
```

* debug - This enables debug logging mode, can be used instead of the command line option ( DEBUG=* homebridge )

```
"platforms": [
  {
    "platform": "G-On Alice",
    "name": "G-On Alice",
    "username": "....",
    "password": "....",
    "debug": true
  }
],
```


## Initial Testing and confirming configuration

5. Start homebridge in DEBUG mode, to ensure configuration of homebridge-g-on-alice is correct.  This will need to be executed with your implementations configuration options and as the same user as you are running homebridge. If you are homebridge with an autostart script ie systemd, you will need to stop the autostart temporarily.

ie
```
DEBUG=g-on-alice* homebridge -I
```

6. Please ensure that homebridge starts without errors.


## Enable Homebridge smarthome skill and link accounts

7. In your Yandex app on your phone, please go to "Devices", press "Add device" and search for the "G-On Homebridge" skill, and enable the skill.  You will need to Enable and link the skill to the account you created earlier on https://homebridge.g-on.io/

## Discover Devices

8. At this point you are ready to have Yandex Alice discover devices. Do it using the phone.
You should see some information about the discovery in the log files.

In the event you have errors, or no devices returned please review your config.

9. Installation is now complete, good luck and enjoy.


# Credits

This particular implementation is forked from original `homebridge-alexa` plugin.
https://github.com/NorthernMan54/homebridge-alexa

This implementation of Alice plugin would have been impossible without them.

* NorthernMan54 - for the actual implementation of the `homebridge-alexa` plugin
