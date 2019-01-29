#!/usr/bin/env node

var App = require('./app.js');

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
