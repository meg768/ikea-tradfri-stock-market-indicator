

module.exports = class Indicator {

    constructor(log, gateway, config) {
        this.gateway = gateway;
        this.config = config;
        this.log = log;

    }

    indicate(options) {
        return this.gateway.operateLight(this.config.lightbulb, options);    
    }

    update() {
        this.log('Indicator updating...');
        return Promise.resolve();
    }

    start() {
        this.log('Indicator starting...');
        return this.update();
    }


}

