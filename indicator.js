

module.exports = class Indicator {

    constructor(log, gateway, config) {
        this.gateway = gateway;
        this.config = config;
        this.log = log;

    }

    indicate(color) {
        this.log('Setting light to', JSON.stringify(color));
        return this.gateway.operateLight(this.config.lightbulb, color);    
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

