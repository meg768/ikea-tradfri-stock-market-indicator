var Ikea         = require('node-tradfri-client');
var ColorConvert = require('color-convert');

module.exports = class Gateway {

    constructor(log) {

        this.gateway = null;
        this.config = {};
        this.log = log;

        if (process.env.IKEA_TRADFRI_SECURITY_CODE)
            this.config.securityCode = process.env.IKEA_TRADFRI_SECURITY_CODE;

        if (process.env.IKEA_TRADFRI_HOST)
            this.config.host = process.env.IKEA_TRADFRI_HOST;

        if (this.config.host == undefined)
            throw new Error('Must specify a host in .env');

        if (this.config.securityCode == undefined)
            throw new Error('The security code from the back of the IKEA gateway must be specified in .env.')

        this.gateway = new Ikea.TradfriClient(this.config.host);
        this.devices = {};

        this.gateway.on('device updated', (device) => {
            this.deviceUpdated(device);
        });

        this.gateway.on('device removed', (device) => {
            this.deviceRemoved(device);
        });

    }

    deviceUpdated(device) {
        delete this.devices[device.name];
        this.devices[device.name] = device;
    }

    deviceRemoved(device) {
        delete this.devices[device.name];
    }




    connect() {
        return new Promise((resolve, reject) => {

            Promise.resolve().then(() => {
                return this.gateway.authenticate(this.config.securityCode);
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
        this.gateway.stopObservingDevices();
        this.gateway.destroy();
    }

    operateLight(device, options) {

        if (typeof device == 'string')
            device = this.devices[device];

        if (device == undefined)
            throw new Error('Device not found.');

        var params = {};

        params.transitionTime = 0.5;

        if (options.red != undefined && options.green != undefined && options.blue != undefined)
            params.color = ColorConvert.rgb.hex(options.red, options.green, options.blue);

        if (options.hue != undefined)
            params.color = ColorConvert.hsl.hex(options.hue, options.saturation != undefined ? 100 : options.saturation, options.luminance != undefined ?  options.luminance : 50) ;

        if (options.brightness != undefined)
            params.dimmer = options.brightness;

        return this.gateway.operateLight(device, params);
    }



}

