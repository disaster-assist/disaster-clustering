const {
    CLOUDANT_BLOB,
} = require('./disaster-credentials/credentials');

const _ = require('underscore');
const Cloudant = require('@cloudant/cloudant');
const cloudant = Cloudant(_.extend(CLOUDANT_BLOB, {'plugins': 'promises'}));

const jDBSCAN = require('jDBSCAN/jDBSCAN');

const conversations = cloudant.db.use('conversations');

function main(params) {

    return conversations.list({include_docs: true}).then(results => {
        return results.rows.filter(doc => {
            return (!!doc.doc.parsed_location) && (typeof doc.doc.location_date === 'number');
        }).map(doc => {
            let geometry = doc.doc.parsed_location.json.results[0].geometry.location;
            return {
                location: {
                    accuracy: 10,
                    latitude: geometry.lat,
                    longitude: geometry.lng,
                },
                timestamp: Math.floor(doc.doc.location_date/1000) //convert to unix timestamp
            }
        });
    }).then(data => {
        console.log(data)

        var dbscanner = jDBSCAN()
            .distance('HAVERSINE')
            .eps(5)           //Maximum distance between points in km
            .minPts(2)        //Minimum points to define a cluster minus one
            .timeEps(86400)   //Maximum time between points in seconds
            .data(data);

        dbscanner();

        return {
            clusters: dbscanner.getClusters()
        }
    });
}

module.exports = {
    main
};

global.main = main;