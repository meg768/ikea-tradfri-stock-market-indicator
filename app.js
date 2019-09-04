
var Gateway = require('./gateway.js');
var fs = require('fs');
var Path = require('path');
var StockMarketIndicator = require('./stock-market-indicator.js');

module.exports = class App {

    constructor() {
        require('dotenv').config();

        this.configFile = Path.join(Path.dirname(__filename), 'config.json');
        this.config = JSON.parse(fs.readFileSync(this.configFile));

        if (!this.config) {
            throw new Error('No configuration file!');
        }

        console.log('DEBUG MODE', this.config.debug);

        this.gateway = new Gateway({log:this.log});

        if (!this.gateway) {
            throw new Error('Could not create gateway!');

        }
        this.indicators = [];


    }

    log() {
        console.log('*************', JSON.stringify(this));
        if (this.config.debug)
            console.log.apply(this, arguments);
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

