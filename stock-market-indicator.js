var Indicator  = require('./indicator.js');
var yahoo      = require('yahoo-finance');
var sprintf    = require('yow/sprintf');
var isDate     = require('yow/is').isDate;

module.exports = class StockMarketIndicator extends Indicator {

    constructor(log, gateway, config) {
        super(log, gateway, config);

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

    computeColor(percentChange) {

        
    }

    update() {
        return new Promise((resolve, reject) => {

            try {
                this.fetch(this.config.symbol).then((quote) => {


                    this.log(sprintf('Fetched quote from Yahoo for symbol %s (%s%.2f%%).', quote.symbol, quote.change >= 0 ? '+' : '-', parseFloat(quote.change)));
    

                    function interpolate(a, b, factor) {
                        var color = {};
                        color.red   = (1 - factor) * a.red + factor * b.red;
                        color.green = (1 - factor) * a.green + factor * b.green;
                        color.blue  = (1 - factor) * a.blue + factor * b.blue;
                        return color;
                    }

                    if (false) {
                        this.log('Quote     ', JSON.stringify(quote));
                        this.log('Last Quote', JSON.stringify(this.lastQuote));    
                    }
    
                    var white      = {red:255, green:204, blue:159};
                    var yellow     = {red:255, green:255, blue:0};
                    var red        = {red:255, green:0, blue:0};
                    var green      = {red:0, green:255, blue:0};
                    var factor     = Math.min(1, Math.abs(quote.change));
                    var color      = interpolate(white, quote.change > 0 ? green : red, factor);

                    // Set to blue when market closed...
                    if (this.lastQuote && quote.time) {
                        if (this.lastQuote.time.valueOf() == quote.time.valueOf()) {
                            color = {red:0, green:0, blue:255};
                        }
    
                    }

                    if (false) {
                        color.hue        = quote.change > 0 ? 120 : 0;
                        color.saturation = 100;
                        color.luminance  = 100 - (Math.min(1, Math.abs(quote.change)) * 100) / 2;

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

    start() {
        
        return new Promise((resolve, reject) => {
            Promise.resolve().then(() => {
                this.loop();
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    
        });
    }


}

