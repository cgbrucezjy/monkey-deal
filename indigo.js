var indico = require('indico.io');

var fs = require('fs');

var redis = require("redis");

var redis_option={
    host:"pub-redis-13746.us-central1-1-1.gce.garantiadata.com",
    port:13746
};



var client = redis.createClient(redis_option.port,redis_option.host,{no_ready_check: true});

// client.auth('', function (err) {
//     if (err) throw err;
// });
client.set("foo", "string val", redis.print);
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
client.get("foo", function (err, reply) {
    if (err) throw err;
    console.log(reply.toString());
});
client.on("error", function (err) {
    console.log("Error " + err);
});


indico.apiKey =  '66df1bd4798a7a3603a61ea1f0c4f37a';

var response = function(res) { console.log(res);
    fs.writeFile("./imgDesc/desc.txt", res, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });     
 }
var logError = function(err) { console.log(err); }
  
// // single example
// indico.imageFeatures("https://slimages.macysassets.com/is/image/MCY/products/5/optimized/2544415_fpx.tif?$filtersm$&wid=126&hei=154")
//   .then(response)
//   .catch(logError);

