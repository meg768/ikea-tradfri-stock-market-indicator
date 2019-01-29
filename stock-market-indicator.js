var Indicator  = require('./indicator.js');
var yahoo      = require('yahoo-finance');
var sprintf    = require('yow/sprintf');

module.exports = class StockMarketIndicator extends Indicator {

    constructor(log, gateway, config) {
        super(log, gateway, config);
    }


    fetch(symbol) {
		return new Promise((resolve, reject) => {
            try {
                var options = {};

                options.symbol = symbol;
                options.modules = ['price', 'summaryProfile', 'summaryDetail'];
  
                this.log(sprintf('Fetching summary profile from Yahoo for symbol %s.', symbol));
    
                yahoo.quote(options).then((data) => {

                    var stock = {};
                    stock.symbol = symbol;
                    stock.name = data.price.longName ? data.price.longName : data.price.shortName;
                    stock.sector = data.summaryProfile ? data.summaryProfile.sector : 'n/a';
                    stock.industry = data.summaryProfile ? data.summaryProfile.industry : 'n/a';
                    stock.exchange = data.price.exchangeName;
                    stock.type = data.price.quoteType.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    stock.change = data.price.regularMarketChangePercent * 100;
                    stock.date = data.price.regularMarketTime;

                    // Fix some stuff
                    stock.name = stock.name.replace(/&amp;/g, '&');
    
                    resolve(stock);
    
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


    update() {
        return new Promise((resolve, reject) => {

            try {
                this.fetch(this.config.symbol).then((stock) => {

                    this.log('Quote', JSON.stringify(stock));
    
                    if (stock.change == undefined)
                        return Promise.resolve();

                    var options = {};
            
                    options.hue        = stock.change > 0 ? 120 : 0;
                    options.saturation = 100;
                    options.luminance  = 100 - (Math.min(1, Math.abs(stock.change)) * 100) / 2;
            
                    this.log('Setting light to', JSON.stringify(options));
    
                    return this.indicate(options);
                })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    this.log('NO!');
                    reject(error);
                })
    
            }
            catch (error) {
                this.log('asfgsfg');
                reject(error);
            }
        });
    }

    loop() {
        this.update().then(() => {
            setTimeout(this.loop.bind(this), 60000 * 5);
        })
        .catch((error) => {
        });

    }

    start() {
        
        return new Promise((resolve, reject) => {
            this.update().then(() => {
                this.loop();
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    
        });
    }


}

