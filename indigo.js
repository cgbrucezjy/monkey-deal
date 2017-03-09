var indico = require('indico.io');

var fs = require('fs');

var redis = require("redis");

var redis_option={
    host:"pub-redis-14483.us-central1-1-1.gce.garantiadata.com",
    port:14483
};



var client = redis.createClient(redis_option.port,redis_option.host,{no_ready_check: true});

client.auth('brucezhang123', function (err) {
    if (err) throw err;
});
// client.set("foo", "string val", redis.print);
// // if you'd like to select database 3, instead of 0 (default), call
// // client.select(3, function() { /* ... */ });
// client.get("foo", function (err, reply) {
//     if (err) throw err;
//     console.log(reply.toString());
// });
client.on("error", function (err) {
    console.log("Error " + err);
});

client.get("imagedes", function (err, reply) {
        if (err) throw err;
        console.log(reply.toString().split(',').map(m=>parseFloat(m)));
    });
indico.apiKey =  '66df1bd4798a7a3603a61ea1f0c4f37a';

var response = function(res) { 
    client.set("imagedes", res.toString(), redis.print);

 }
var logError = function(err) { console.log(err); }
  
// single example
// indico.imageFeatures("https://slimages.macysassets.com/is/image/MCY/products/5/optimized/2544415_fpx.tif?$filtersm$&wid=126&hei=154")
//   .then(response)
//   .catch(logError);

