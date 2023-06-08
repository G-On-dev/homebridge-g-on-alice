**homebridge-g-on-alice**

Enable Yandex Alice access and control your homebridge controlled devices and accessories. Supports Alice on Smartphone, PC, Yandex Station and other Yandex devices.

# Features

* Supports one HomeBridge, running on the same host as this plugin
* Supports the following HomeKit accessory types: Lightbulb, Outlet, Switch, Fan, Thermostat and others.
* This plugin does not have any devices or accessories that are visible from Homekit, and does not need to be added on the Home app.

# Supported devices

* Support for Light Bulbs (on/off, brightness, color change and color temperature for white light)
* Support for Switches and outlets (on/off)
* Support for Thermostats (target heating cooling ctate, target and current temperature, target and current humidity), 
* Support for Heater/Cooler (on/off, target heating cooling ctate, current temperature, rotation speed)
* Support for Humidifier Dehumidifier (on/off, current humidity, relative humidity dehumidifier or humidifier threshold (only one is available), rotation speed)
* Support for Air Purifier (on/off, rotation speed)
* Support for Door, Window, Window Covering (open/close, target position)
* Support for Garage Door Opener, Lock Mechanism (open/close)
* Support for Buttons (single, double, long press)
* Support for Sensors: Temperature, Humidity, Light, Carbon Dioxide (level and status low battery)
* Support for Air Quality Sensor (PM10 Density, PM2.5 Density, VOC Density, status low battery)
* Support for Binary Sensors: Contact, Leak, Motion, Occupancy, Smoke (level and status low battery)
* Support for Fan (on/off, rotation speed)
* Support for Valve, Faucet (on/off)
* Support for Televisions, Television Speakers, Speakers (on/off, play/pause, mute, volume)
* Support up to 100 accessories

Alice device names are the same as the homebridge device names.

This only supports accessories connected via a homebridge plugin, any 'Homekit' accessories are not supported.

## HomeKit/Homebridge Devices supported

### Native Support

* Lightbulbs, outlets and switches
* Dimmable lightbulbs, outlets and switches
* Color light bulbs and white light bulbs with color temperature adjustment
* Thermostat
* Heater/Cooler
* Humidifiers
* Air Purifiers
* Doors, windows, curtains
* Buttons
* Televisions, Speakers

### Unsupported device types

* Camera's
* Eve devices
* Security Systems
* Some audio and playback systems

# Alice Voice Commands

## Light bulbs / Switches / Dimmer Switches

* Алиса, включи *device*
* Алиса, выключи *device*

* Алиса, установи яркость *device* на минимум
* Алиса, установи яркость *device* на 50%
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
* Notifies the smart home platform about the changed state of the devices

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
