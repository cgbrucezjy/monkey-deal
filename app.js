var Crawler = require("crawler");
var admin = require("firebase-admin");

var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var salesRef=admin.database().ref('/sales');
var url = require('url');
var defaultURL='http://www1.macys.com';
var visited =[];
var result = {};
var exclude =['/shop/product'];
visited.push(defaultURL);

var appendURL= function(url){
    return url.includes('http') ? url : defaultURL+url;
}

var convertPriceFromString = function(p){
    //console.log(p);
    return parseFloat(p.trim().match(/\d.+/)[0]);
}
var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($("title").text());
            var priceDiv=$('.prices');
            if(priceDiv)
            {
                priceDiv.map(index=>{
                    //console.log('price div');
                    //console.log(priceDiv[index]);
                    var orig=false;
                    var sale=false;
                    priceDiv[index].children.filter(obj=>'children' in obj)
                    .map(colorway=>{
                        
                        orig=orig? orig : colorway.children.filter(obj=>'name' in obj && obj.name=='span')
                        .filter(obj=> obj.children[0].data.includes('Orig'))
                        .map(tag=>{
                            //console.log('orig',tag.children[0].data.substring(tag.children[0].data.indexOf('$')))
                            return tag.children[0].data.substring(tag.children[0].data.indexOf('$'));
                        })[0]
                        
                        sale=sale? sale : colorway.children.filter(obj=>'name' in obj && obj.name=='span')
                        .filter(obj=> obj.children[0].data.includes('Sale'))
                        .map(tag=>{
                            //console.log('sale',tag.children[0].data.substring(tag.children[0].data.indexOf('$')))
                            return tag.children[0].data.substring(tag.children[0].data.indexOf('$'));
                        })[0]
                        //console.log(orig,sale)
                        


                    })
                    //console.log(orig)
                    if(orig && sale)
                    {
                        var origPrice=convertPriceFromString(orig)
                        var salePrice=convertPriceFromString(sale)
                        var diffPercent = (origPrice-salePrice)/salePrice*100
                        //console.log(diffPercent,'%')
                        if(diffPercent>300)
                        {
                            // console.log('orig '+orig);
                            // console.log('Sale '+sale);
                            //console.log(priceDiv[index].parent);
                            var textwraper=priceDiv[index].parent.children;
                            var shortDesc=textwraper
                            .filter(obj=>obj.attribs && obj.attribs.class=='shortDescription')
                            .map(obj=> obj.children)[0];
                            if(shortDesc)
                            {
                                var link=shortDesc.filter(obj=> obj.name && obj.name=='a').map(l=>{
                                    
                                    var resultURL = appendURL(l.attribs.href)
                                    var resultDesc = {
                                        desc:l.children && l.children[0] ? l.children[0].data : "no description",
                                        orig : orig.trim(),
                                        sale : sale.trim(),
                                        url:resultURL
                                    }
                                    result[resultURL]=resultDesc;
                                    var postKey=salesRef.push().key
                                    var updates = {}
                                    updates[postKey] = resultDesc;
                                    salesRef.update(updates);
                                    if(Object.keys(result).length>10)
                                    {
                                        console.log('reach here');
                                        done()
                                    }
                                    
                                    console.log(resultDesc,Object.keys(result).length);
                                })
                            }
                            
                        }
                    }

                    //var colorway=priceDiv[index]

                })
                
                //console.log(priceDiv);
                
            }

            //file all other links
            var anchors =$('li a');
            anchors.map(link=>{
                //console.log(link)
                if(anchors[link].attribs)
                {
                    var finallink=appendURL(anchors[link].attribs.href=defaultURL+anchors[link].attribs.href);
                    if(finallink.includes(defaultURL) && visited.indexOf(finallink)==-1)
                    {
                        if(exclude.indexOf(finallink)==-1 && Object.keys(result).length<10)
                        {
                            c.queue(finallink);
                            visited.push(finallink);
                            //console.log(finallink);
                        }

                    }
                    
                }
                    
            })
      
            //c.queue($('li a')[832].attribs.href);
        }
        done();
    }
});

// Queue just one URL, with default callback
c.queue('https://www.macys.com');