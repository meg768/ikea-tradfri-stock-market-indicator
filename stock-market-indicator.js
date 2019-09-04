var Indicator  = require('./indicator.js');
var yahoo      = require('yahoo-finance');
var sprintf    = require('yow/sprintf');

module.exports = class StockMarketIndicator extends Indicator {

    constructor(args) {
        super(args);

        this.lastQuote = undefined;
    }


    fetch(symbol) {
		return new Promise((resolve, reject) => {
            try {
                var options = {};

                options.symbol = symbol;
                options.modules = ['price', 'summaryProfile', 'summaryDetail'];
  
                yahoo.quote(options).then((data) => {
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
    
                    resolve(quote);
    
                })
                .catch((error) => {
                    this.log(sprintf('Could not get general information about symbol %s. %s', symbol, error.message));
                    resolve({});
                });
    
            }
            catch (error) {
                reject(error);
            }
		})
	}

    computeColorX(quote) {

        function interpolate(a, b, factor) {
            var color = {};
            color.red   = (1 - factor) * a.red + factor * b.red;
            color.green = (1 - factor) * a.green + factor * b.green;
            color.blue  = (1 - factor) * a.blue + factor * b.blue;
            return color;
        }

        var white      = {red:255, green:204, blue:159};
        var red        = {red:50, green:0, blue:0};
        var green      = {red:0, green:255, blue:0};
        var factor     = Math.min(1, Math.abs(quote.change));
        var color      = interpolate(white, quote.change > 0 ? green : red, factor);

        return color;
    }

    computeColorRGB(quote) {

        var neutral = {red:209, green:202, blue:245};

        var baisse = [
            {red:255, green:170, blue:170},
            {red:255, green:160, blue:160},
            {red:240, green:140, blue:140},
            {red:255, green:130, blue:130},
            {red:255, green:110, blue:110},
            {red:255, green: 90, blue: 90},
            {red:255, green: 70, blue: 70},
            {red:255, green: 51, blue: 51},
            {red:255, green: 40, blue: 40},
            {red:255, green:  0, blue:  0}
        ];

        var hausse = [
            {red:120, green:252, blue:120},
            {red:110, green:250, blue:110},
            {red: 90, green:250, blue: 90},
            {red: 90, green:240, blue: 90},
            {red: 70, green:240, blue: 70},
            {red: 80, green:220, blue: 80},
            {red: 40, green:220, blue: 40},
            {red:  0, green:230, blue:  0},
            {red:  0, green:240, blue:  0},
            {red:  0, green:255, blue:  0}
        ];

        var array  = quote.change > 0 ? hausse : baisse;
        var change = Math.min(Math.abs(quote.change), 1);
        var index  = Math.min(Math.floor(change * array.length), array.length - 1);

        return change == 0 ? neutral : array[index];
 
    }

    computeColorHSL(quote) {
        var change     = Math.max(-1, Math.min(1, quote.change * 100));
        var hue        = change >= 0 ? 120 : 0;
        var saturation = 100;
        var luminance  = Math.abs(change) / 2);

        return {hue:hue, saturation:saturation, luminance:luminance}
    }

    update() {
        return new Promise((resolve, reject) => {

            try {
                this.fetch(this.config.symbol).then((quote) => {

                    this.log(sprintf('Fetched quote from Yahoo for symbol %s (%s%.2f%%).', quote.symbol, quote.change >= 0 ? '+' : '-', parseFloat(quote.change)));
    
                    var color = this.computeColorRGB(quote);

                    if (true) {
                        color = this.computeColorHSL(quote);
                    }

                    // Set to blue when market closed...
                    if (this.lastQuote && quote.time) {
                        if (this.lastQuote.time.valueOf() == quote.time.valueOf()) {
                            color = {red:0, green:0, blue:5};
                        }
                    }
                    
                    this.lastQuote = quote;

                    return this.indicate(color);
                })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
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
            this.test().then(() => {
                this.loop();
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    
        });
    }


}

