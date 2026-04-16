![Logo](admin/icloud.png)
# ioBroker.icloud

[![NPM version](https://img.shields.io/npm/v/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
![Number of Installations](https://iobroker.live/badges/icloud-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/icloud-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.icloud.png?downloads=true)](https://nodei.co/npm/iobroker.icloud/)

**Tests:** ![Test and Release](https://github.com/ticaki/ioBroker.icloud/workflows/Test%20and%20Release/badge.svg)

## icloud adapter for ioBroker

This adapter connects ioBroker to your Apple iCloud account. It reads the location of your devices via **Find My** and exposes them as ioBroker states, including GPS coordinates, battery level, and distance to configurable home points.

## Configuration

1. Open the adapter settings in the ioBroker Admin UI.
2. Enter your **Apple ID** (e-mail address) in the *Username* field.
3. Enter your **Apple ID password** in the *Password* field.
4. Enable or disable **Find My** and set the refresh interval (minutes).
5. Optionally add named home-location points (latitude/longitude) to get a calculated distance for each device.
6. Save the settings — the adapter starts the authentication immediately.

## Two-factor authentication (2FA)

2FA may be required when signing in. If Apple requests a verification code, the state `icloud.<instance>.mfa.required` is set to `true`.

### SMS code

1. Set the state `icloud.<instance>.mfa.requestSmsCode` to `true`.
2. Apple sends a 6-digit code via SMS to the phone number registered with your Apple ID.
3. Write the received code into `icloud.<instance>.mfa.code`.
4. The adapter submits the code and connects. `mfa.required` is reset to `false` automatically.

> **Note:** Other 2FA methods (trusted device push etc.) may be supported by the underlying API but have not been tested.


## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (ticaki) initial release

## License
MIT License

Copyright (c) 2026 ticaki <github@renopoint.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.