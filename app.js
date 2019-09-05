
var Gateway = require('./gateway.js');
var fs = require('fs');
var Path = require('path');
var sprintf = require('yow/sprintf');
var StockMarketIndicator = require('./stock-market-indicator.js');

module.exports = class App {

    constructor() {
        require('dotenv').config();

        var configFile = Path.join(Path.dirname(__filename), 'config.json');
        var config = JSON.parse(fs.readFileSync(configFile));

        if (!config) {
            throw new Error('No configuration file!');
        }

        this.indicators = [];
        this.configFile = configFile;
        this.config = config;

        this.gateway = new Gateway({log:this.log});
    }

    log() {
        var date = new Date();
        var prefix = sprintf('%04d-%02d-%02d %02d:%02d.%02d:', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
        var args = [prefix].concat(Array.prototype.slice.call(arguments));

        console.log.apply(this, args);
    }

    run() {
		return new Promise((resolve, reject) => {
            this.gateway.connect().then(() => {
                return Promise.resolve();
            })
            .then(() => {

                this.config.indicators.forEach((config) => {
                    this.indicators.push(new StockMarketIndicator({log:this.log, gateway:this.gateway, config:config}));
                });

                var promise = Promise.resolve();

                this.indicators.forEach((indicator) => {

                    promise = promise.then(() => {
                        return indicator.start();
                    });
                });

                return promise;

            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                this.gateway.disconnect();        
                reject(error);
            });
        });
    }


}

