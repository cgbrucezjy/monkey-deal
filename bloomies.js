var Crawler = require("crawler");
var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var salesRef=admin.database().ref('/bloomies');
var url = require('url');

var defaultURL='http://www1.bloomingdales.com';
var visited =[];
var result = {};
var exclude =['/shop/product','Rug','customerservice-bloomingdales','account','creditservice','.jsp'];

var threshold=74
var appendURL= function(url){
    
    return url.includes('http') ? url : defaultURL+url;
}

var convertPriceFromString = function(p){
    //console.log(p);
    p=p.replace(',','')
    return parseFloat(p.trim().match(/\d.+/)[0]);
}
var c = new Crawler({
    maxConnections : 1,
    rateLimit:0,
    skipDuplicates:true,
    rotateUA:true,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            if(typeof($)=='function')
            {
                var title=$("title").text();
                console.log(title);

                var priceDiv=$('.prices');
                var catagory="";
                var cata=$(".pageHeader");
                //console.log(cata['0'])
                
                if(cata['0'])
                {
                    console.log(cata['0'])
                    stop
                }
                if(priceDiv && visited.indexOf(title)==-1)
                {
                    visited.push(title);
                    priceDiv.map(index=>{
                        var reg;
                        var sale;
                        var filteredPriceDiv=priceDiv[index].children.filter(obj=>obj.attribs && obj.attribs.class.includes('priceSale'));
                        //get orig price
                        filteredPriceDiv.map(pricesale=>{
                            //console.log(pricesale);
                            pricesale.children.filter(obj=>obj.children).map(obj=>{
                                
                                obj.children.filter(obj=> obj.data && obj.data.includes('$')).map(origPriceDiv=>{

                                    reg=convertPriceFromString(origPriceDiv.data)
                                    //console.log(reg)
    
                                })
                                obj.children.filter(obj=> obj.name && obj.attribs.class=='priceSale').map(nowPriceDiv=>{
                                    //console.log(nowPriceDiv)
                                    var sale_=nowPriceDiv.children.filter(obj=>obj.data && obj.data.includes('$')).map(obj=>obj.data.trim())
                                    sale=sale_[0] ? convertPriceFromString(sale_[0]) : sale_[0]
                                    //console.log('sale',sale)
                                    //console.log(stop);
                                })

                                if(reg && sale)
                                {
                                    
                                    var diffPercent = (reg-sale)/reg*100
                                    if(diffPercent>threshold && reg>20)
                                    {
                                        var updateData={orig:reg,sale:sale};
                                        console.log(reg,sale)
                                        //get desc
                                        priceDiv[index].parent.children
                                        .filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('shortDescription'))
                                        .map(desc=>{
                                            //console.log(desc)
                                            desc.children
                                            .filter(obj=>obj.attribs && obj.attribs.id && obj.attribs && obj.attribs.id=='brandName')
                                            .map(bn=>{
                                                updateData.brandName=bn.children[0].children[0].data
                                            });
                                            
                                            desc.children
                                            .filter(obj=>obj.attribs && obj.attribs.id && obj.attribs && obj.attribs.id=='prodName')
                                            .map(pn=>{
                                                updateData.description=pn.children[0].children[0].data
                                            })[0];

                                            
                                        })

                                        //get image and link
                                        priceDiv[index].parent.children
                                        .filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('productImages'))
                                        .map(imgDiv=>
                                            imgDiv.children.filter(potImage=>potImage.name && potImage.name=='a')
                                            .map(imgDiv=>{
                                                //console.log(imgDiv)
                                                updateData.link=imgDiv.attribs.href
                                                imgDiv.children.filter(img=>img.name && img.name=='img').map(img=>{
                                                    //console.log(img)
                                                    updateData.imgURL=img.attribs.src
                                                })
                                                //console.log(stop)
                                            })
                                        )
                                        var filterCheck=true;
                                        exclude.map(e=>{
                                            if(updateData.description.includes(e))
                                                filterCheck=false;
                                        })
                                        if(filterCheck)
                                        {
                                            console.log(updateData);
                                            var postKey=salesRef.push().key
                                            var updates = {}
                                            updates[postKey] = updateData;
                                            salesRef.update(updates);
                                        }

                                    }
                                }
                            })
                            
                            //console.log("nextß");
                        })

                    })
                }



                //file all other links
                var anchors =$('li a');
                anchors.map(link=>{
                    //console.log(link)
                    if(anchors[link].attribs && anchors[link].attribs.href)
                    {
                        var finallink=appendURL(anchors[link].attribs.href);
                        if(finallink.includes('shop/sale'))
                        {

                                // setTimeout(function(){
                                //console.log(finallink);
                                   c.queue({
                                        uri:finallink,
                                        proxy:"http://127.0.0.1:5050"
                                    })                             
                                // }, 100+Math.random()*300)

                                //visited.push(finallink);
                                //console.log(finallink);
                            

                        }
                        
                    }
                        
                })
            }

      
        }
        done();
    }
});

// Queue just one URL, with default callback
c.queue({
    uri:'http://www1.bloomingdales.com/shop/sale',
    proxy:"http://127.0.0.1:5050"
});