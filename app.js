
var Gateway = require('./gateway.js');
var fs = require('fs');
var Path = require('path');
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

        this.log = () => {
            if (this.config.debug)
                console.log.apply(this, arguments);
    
        }

        this.gateway = new Gateway({log:this.log});
    }

    log() {
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

