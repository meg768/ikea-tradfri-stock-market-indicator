var Ikea = require('node-tradfri-client');
var ColorConvert = require('color-convert');

module.exports = class Gateway {

    constructor(log) {

        this.gateway = null;
        this.log = log;
        this.devices = {};

        if (process.env.IKEA_TRADFRI_SECURITY_CODE == undefined)
            throw new Error('The security code from the back of the IKEA gateway must be specified in .env.');

    }

    getHostName() {
        return new Promise((resolve, reject) => {

            if (process.env.IKEA_TRADFRI_HOST != undefined)
                resolve(process.env.IKEA_TRADFRI_HOST);
            else {
                this.log('Discovering gateway...');

                Ikea.discoverGateway().then((discovery) => {
                    this.log('Discovered host "%s"', discovery.name);
                    resolve(discovery.name);
                })
                .catch((error) => {
                    reject(error);
                })
            }
        });        
    }

    connect() {
        return new Promise((resolve, reject) => {

            Promise.resolve().then(() => {
                return this.getHostName();
            })

            .then((host) => {
                this.gateway = new Ikea.TradfriClient(host);

                this.gateway.on('device updated', (device) => {
                    delete this.devices[device.name];
                    this.devices[device.name] = device;
                });
        
                this.gateway.on('device removed', (device) => {
                    delete this.devices[device.name];
                });

                return Promise.resolve();
            })

            .then(() => {
                return this.gateway.authenticate(process.env.IKEA_TRADFRI_SECURITY_CODE);
            })
            .then((credentials) => {
                return this.gateway.connect(credentials.identity, credentials.psk);
            })
            .then((connected) => {
                if (connected)
                    return Promise.resolve();
                else
                    reject(new Error('Could not connect.'));
            })
            .then(() => {
                this.log('Loading devices...');
                return this.gateway.observeDevices();
            })
            .then(() => {
                this.log('Connected.');
        
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        });
    }

    disconnect() {
        this.log('Disconnecting...');
        
        if (this.gateway) {
            this.gateway.stopObservingDevices();
            this.gateway.destroy();
    
        }
    }

    operateLight(device, color) {

        if (typeof device == 'string')
            device = this.devices[device];

        if (device == undefined)
            throw new Error('Device not found.');

        var params = {};

        params.transitionTime = 0;
        console.log(JSON.stringify(color));

        if (color.red != undefined && color.green != undefined && color.blue != undefined) {
            var hsv = ColorConvert.rgb.hsv(color.red, color.green, color.blue);
            params.color  = ColorConvert.rgb.hex(color.red, color.green, color.blue);
            params.dimmer = hsv[2];
        }
        else if (color.hue != undefined && color.saturation != undefined && color.luminance != undefined) {
            var hsv = ColorConvert.hsl.hsv(color.hue, color.saturation, color.luminance);
            params.color  = ColorConvert.hsl.hex(color.hue, color.saturation, color.luminance);
            params.dimmer = hsv[2];
        }
        else {
            throw new Error('Invalid color value specified.');
        }

        return this.gateway.operateLight(device, params);
    }



}

