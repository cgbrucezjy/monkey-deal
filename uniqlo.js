var Crawler = require("crawler");
var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var url = require('url');

var visited =[];
var result = {};
var specialCata=['Girls','Boys','Baby']
var exclude =['/shop/product','Rug','customerservice-bloomingdales','account','creditservice','.jsp'];

var threshold=50
var appendURL= function(url){
    
    return url.includes('http') ? url : defaultURL+url;
}

var convertPriceFromString = function(p){
    //console.log(p);
    p=p.replace(',','')
    p=p.replace('$','')
    return parseFloat(p.trim().match(/\d.+/)[0]);
}
var callback=function(error, res, done){
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            if(typeof($)=='function')
            {
                var title=$("title").text();
                console.log(title);

                var priceDiv=$('.product-pricing');
                var catagory="";
                var cata=$(".has-sub-menu.red");
                //console.log(cata['0'])

                if(cata['0'])
                {
                   catagory=cata['0'].children[0].data.trim();
                }

                priceDiv.map(index=>{
                    var orig;
                    var sales;
                    priceDiv[index].children
                    .filter(obj=>obj.attribs && obj.attribs.title && obj.attribs.title=='Standard Price')
                    .map(child=>{
                        orig=convertPriceFromString(child.children[0].data);
                    })
                    priceDiv[index].children
                    .filter(obj=>obj.attribs && obj.attribs.title && obj.attribs.title=='Sale Price')
                    .map(child=>{
                        sales=convertPriceFromString(child.children[0].data);
                    })

                    if(sales && orig)
                    {
                         var dif = (orig-sales)/orig*100
                        if(dif>threshold || (specialCata.indexOf(catagory)!=-1 && dif>5 ) )
                        {
                             var resultDesc = {
                                desc:'',
                                orig : orig,
                                sale : sales,
                                link:'',
                                imgURL:''
                            }

                            var img=priceDiv[index].parent.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='product-image')
                            img[0].children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='thumb-link')
                            .map(child=>{
                                resultDesc.link=child.attribs.href
                                child.children.filter(obj=> obj.name && obj.name=='img')
                                .map(c=>{
                                    resultDesc.imgURL=c.attribs.src
                                })
                            })
                            img[0].parent.children.filter(obj=> obj.attribs && obj.attribs.class && obj.attribs.class=='product-name')
                            .map(productName=>{
                                productName.children.filter(obj=>obj.attribs && obj.attribs.href)
                                .map(c=>{
                                    resultDesc.desc=c.children[0].data
                                })
                            })

                            console.log(resultDesc);
                            var salesRef=admin.database().ref('/uniqlo');
                            if(catagory!="")
                            {
                                console.log(catagory);
                                salesRef=salesRef.child(catagory)
                                result[resultDesc.link]=resultDesc;
                                var postKey=salesRef.push().key
                                var updates = {}
                                updates[postKey] = resultDesc;
                                salesRef.update(updates);
                            }
                        }

                    }
                    //debug
                })
                if(priceDiv['0'])
                {
                    //dont add any links
                }
                else
                {
                    var anchors =$('.navsmall .refinement-link ');
                    anchors.map(link=>{
                        if(anchors[link].attribs && anchors[link].attribs.href)
                        {
                            var finallink=anchors[link].attribs.href;

                            console.log(finallink);
                            if(visited.indexOf(finallink)==-1)
                            {
                                    console.log(finallink);
                                    visited.push(finallink);
                                    c.queue({
                                            uri:finallink
                                        })                             
                                

                            }
                            
                        }
                            
                    })
                }

            }

      
        }
        done();
}
var c = new Crawler({
    maxConnections : 1,
    rateLimit:0,
    skipDuplicates:true,
    rotateUA:true,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        setTimeout(function(){
            callback(error,res,done)
        },100+Math.random()*300)
    }
});

// Queue just one URL, with default callback
// node --max_old_space_size=4096 yourFile.js

c.queue({
    uri:'http://www.uniqlo.com/us/en/women/'
});

c.queue({
    uri:'https://www.uniqlo.com/us/en/men/'
});
c.queue({
    uri:'http://www.uniqlo.com/us/en/girls/'
});

c.queue({
    uri:'https://www.uniqlo.com/us/en/boys/'
});

c.queue({
    uri:'https://www.uniqlo.com/us/en/baby/'
});

c.on('drain',function(){
    // For example, release a connection to database.
    console.log('done')// close connection to MySQL
});