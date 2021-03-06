var Indicator  = require('./indicator.js');
var yahoo      = require('yahoo-finance');
var sprintf    = require('yow/sprintf');

module.exports = class StockMarketIndicator extends Indicator {

    constructor(args) {
        super(args);

        this.lastQuote = undefined;
    }


    fetch(symbol) {

        var then = new Date();

		return new Promise((resolve, reject) => {
            try {
                var options = {};

                options.symbol = symbol;
                options.modules = ['price', 'summaryProfile', 'summaryDetail'];
  
                yahoo.quote(options).then((data) => {
                    var now = new Date();
                    var time = Math.floor(now.valueOf() - then.valueOf());

                    var quote = {};
                    quote.symbol = symbol;
                    quote.name = data.price.longName ? data.price.longName : data.price.shortName;
                    quote.sector = data.summaryProfile ? data.summaryProfile.sector : 'n/a';
                    quote.industry = data.summaryProfile ? data.summaryProfile.industry : 'n/a';
                    quote.exchange = data.price.exchangeName;
                    quote.type = data.price.quoteType.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    quote.change = data.price.regularMarketChangePercent * 100;
                    quote.time = data.price.regularMarketTime;
                    quote.price = data.price.regularMarketPrice;

                    // Fix some stuff
                    quote.name = quote.name.replace(/&amp;/g, '&');

                    this.log(sprintf('Fetched quote from Yahoo for symbol %s (%s%.2f%%). Took %d ms.', quote.symbol, quote.change >= 0 ? '+' : '-', parseFloat(Math.abs(quote.change)), time));
    
                    resolve(quote);
    
                })
                .catch((error) => {
                    this.log(sprintf('Could not get general information about symbol %s. %s', symbol, error.message));
                    reject(error);
                });
    
            }
            catch (error) {
                reject(error);
            }
		})
	}

    computeColor(quote) {
        var change     = Math.max(-1, Math.min(1, quote.change));
        var hue        = change >= 0 ? 240 : 0;
        var saturation = 100;
        var luminance  = 0 + (Math.abs(change) * 50);

        luminance = 100;
        saturation = 50 + (Math.abs(change) * 50);

        return {hue:hue, saturation:saturation, luminance:luminance}
    }

    delay(ms) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, ms);
        });
    }
    update() {
        return new Promise((resolve, reject) => {

            try {

                this.fetch(this.config.symbol).then((quote) => {

                    var color = this.computeColor(quote);

                    // Set to blue when market closed...
                    if (false) {
                        if (this.lastQuote && quote.time) {
                            if (this.lastQuote.time.valueOf() == quote.time.valueOf()) {
                                color = {red:0, green:0, blue:5};
                            }
                        }
    
                    }
                    
                    this.lastQuote = quote;

                    return color;
                })
                .then((color) => {
                    var now = new Date();
                    var hour = now.getHours();

                    if (hour >= 9 && hour <= 22)
                        return color;
                    else
                        return ({hue:0, saturation:0, luminance:0});

                })
                .then((color) => {
                    this.indicate(color);

                })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    resolve();
                })
    
            }
            catch (error) {
                reject(error);
            }
        });
    }

    loop() {
        // Get update interval from config, default 5 minutes
        var updateInterval = (parseFloat(this.config.updateInterval) || 5) * 60000;

        this.update().then(() => {
            setTimeout(this.loop.bind(this), updateInterval);
        })
        .catch((error) => {
            this.log(error.stack);
            setTimeout(this.loop.bind(this), updateInterval);
        });

    }

    test() {
        return Promise.resolve();
        return new Promise((resolve, reject) => {


            var delay = (ms) => {
                return new Promise((resolve, reject) => {
                    setTimeout(resolve, 1000);
                });
            };

            var promise = Promise.resolve();
            var quote = {change:-1.2};
    
            for (var i = 0; i < 25; i++) {

                promise = promise.then(() => {
                    var color = this.computeColor(quote);
                    quote.change += 0.1;
                    console.log('*******************', quote, color)
                    return this.indicate(color);
                })
                .then(() => {                    
                    return delay(2000);
                });

            }
            promise.then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.update().then(() => {
                return this.delay(1000);
            })
            .then(() => {
                this.loop();
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    
        });
    }


}

