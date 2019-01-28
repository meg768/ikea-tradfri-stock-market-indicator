#!/usr/bin/env node

var sprintf    = require('yow/sprintf');
var yahoo      = require('yahoo-finance');
var Gateway    = require('./gateway.js');
var fs         = require('fs');
var Path       = require('path');

class App {

    constructor() {
        require('dotenv').config();

        this.configFile = Path.join(Path.dirname(__filename), 'config.json');
        this.gateway = new Gateway(this.log);
        this.config = JSON.parse(fs.readFileSync(this.configFile));

    }

    log() {
        console.log.apply(this, arguments);
    }

    fetch(symbol) {
		return new Promise((resolve, reject) => {
			var options = {};

			options.symbol = symbol;
			options.modules = ['price', 'summaryProfile', 'summaryDetail'];

			console.log(sprintf('Fetching summary profile from Yahoo for symbol %s.', symbol));

			yahoo.quote(options).then((data) => {
				var stock = {};
				stock.symbol = symbol;
				stock.name = data.price.longName ? data.price.longName : data.price.shortName;
				stock.sector = data.summaryProfile ? data.summaryProfile.sector : 'n/a';
				stock.industry = data.summaryProfile ? data.summaryProfile.industry : 'n/a';
				stock.exchange = data.price.exchangeName;
				stock.type = data.price.quoteType.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                stock.change = data.price.regularMarketChangePercent * 100;
                
				// Fix some stuff
				stock.name = stock.name.replace(/&amp;/g, '&');

				resolve(stock);

			})
			.catch((error) => {
				this.log(sprintf('Could not get general information about symbol %s. %s', symbol, error.message));
				resolve({});
			});
		})
	}

    setLight(lightbulb, stock) {
        this.log('Quote', JSON.stringify(stock));

        if (stock.change == undefined)
            return Promise.resolve();

        var light = {};

        light.hue        = stock.change > 0 ? 120 : 0;
        light.saturation = 100;
        light.luminance  = 100 - (Math.min(1, Math.abs(stock.change)) * 100) / 2;

        this.log('Setting light to', JSON.stringify(light));
        return this.gateway.setLight(lightbulb, light);
    }

    updateIndicator(indicator) {
        return new Promise((resolve, reject) => {

            this.fetch(indicator.symbol).then((stock) => {
                return this.setLight(indicator.lightbulb, stock)
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        });

    }

    updateIndicators() {
        return new Promise((resolve, reject) => {

            var promise = Promise.resolve();

            this.config.indicators.forEach((indicator) => {
                promise = promise.then(() => {
                    return this.updateIndicator(indicator)
                });
            });

            promise.then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    loop() {
        this.updateIndicators().then(() => {
            setTimeout(this.loop.bind(this), 60000 * 5);
        });    
    }

    run(forever) {
		try {
            this.gateway.connect().then(() => {
                return Promise.resolve();
            })
            .then(() => {
                if (forever)
                    this.loop();
                else
                    return this.updateIndicators();

            })
            .then(() => {
                if (!forever)
                    this.gateway.disconnect();

            })
            .catch(function(error) {
				console.error(error.stack);

			});

		}
		catch(error) {
			console.error(error.stack);
		}	        
    }
}


var app = new App();
app.run(true);
