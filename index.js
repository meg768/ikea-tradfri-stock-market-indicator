#!/usr/bin/env node

var Gateway    = require('./gateway.js');
var fs         = require('fs');
var Path       = require('path');
var StockMarketIndicator = require('./stock-market-indicator.js');

class App {

    constructor() {
        require('dotenv').config();

        this.configFile = Path.join(Path.dirname(__filename), 'config.json');
        this.gateway = new Gateway(this.log);
        this.config = JSON.parse(fs.readFileSync(this.configFile));
        this.indicators = [];

    }

    log() {
        console.log.apply(this, arguments);
    }

    run() {
		return new Promise((resolve, reject) => {
            this.gateway.connect().then(() => {
                return Promise.resolve();
            })
            .then(() => {

                this.config.indicators.forEach((config) => {
                    this.indicators.push(new StockMarketIndicator(this.log, this.gateway, config));
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


var app = new App();

try {
    app.run().then(() => {

    })
    .catch((error) => {
        console.error(error.stack);
    });

}
catch(error) {
    console.error(error.stack);
}
