var Crawler = require("crawler");
var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var url = require('url');

var defaultURL='http://www1.bloomingdales.com';
var visited =[];
var result = {};
var exclude =['/shop/product','Rug','customerservice-bloomingdales','account','creditservice','.jsp'];

var threshold=69
var appendURL= function(url){
    
    return url.includes('http') ? url+'&cm_sp=NAVIGATION-_-TOP_NAV-_-SALE-n-n' : defaultURL+url+'&cm_sp=NAVIGATION-_-TOP_NAV-_-SALE-n-n';
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
                console.log(res.options.uri)
                console.log(title);

                var priceDiv=$('.prices');
                var catagory="";
                var cata=$(".bcElement");
                //console.log(cata['0'])
                
                if(cata['1'])
                {
                    catagory=cata['1'].children[0].data
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
                                                updateData.desc=pn.children[0].children[0].data
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
                                            if(updateData.desc.includes(e))
                                                filterCheck=false;
                                        })
                                        if(filterCheck)
                                        {
                                            var salesRef=admin.database().ref('/bloomies');
                                            if(catagory!="")
                                            {
                                                console.log(catagory);
                                                salesRef=salesRef.child(catagory)
                                            }
                                            else
                                            {
                                                salesRef=salesRef.child('Others')
                                            }
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
                        var anchors =$('.nav_cat_sub .gn_left_nav');
                        anchors.map(link=>{
                            //console.log(link)
                            if(anchors[link].attribs && anchors[link].attribs.href)
                            {
                                var finallink=appendURL(anchors[link].attribs.href);
                                if(finallink.includes('shop/sale'))
                                {

                                        // setTimeout(function(){
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
                else
                {
                        var anchors =$('.gn_left_nav2_standard .gn_left_nav');
                        anchors.map(link=>{
                            //console.log(link)
                            if(anchors[link].attribs && anchors[link].attribs.href)
                            {
                                var finallink=appendURL(anchors[link].attribs.href);
                                if(finallink.includes('shop/sale'))
                                {

                                        // setTimeout(function(){
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
                //file all other links

            }

      
        }
        done();
    }
});

// Queue just one URL, with default callback
// node --max_old_space_size=4096 yourFile.js
c.queue({
    uri:'http://www1.bloomingdales.com/shop/sale?id=3977&cm_sp=NAVIGATION-_-TOP_NAV-_-SALE-n-n',
    proxy:"http://127.0.0.1:5050"
});

c.on('drain',function(){
    // For example, release a connection to database.
    console.log('done')// close connection to MySQL
});