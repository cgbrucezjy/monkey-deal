var Crawler = require("crawler");
var admin = require("firebase-admin");


var serviceAccount = require("./service-account.json");
var userAgents = require("./user-agent-list.json");
userAgents.map(ua=>ua.pattern)

//console.log(userAgents);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});


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
    p=p.replace(',','')
    return parseFloat(p.trim().match(/\d.+/)[0]);
}
var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    rateLimit:0,
    skipDuplicates:true,
    rotateUA:true,
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($("title").text());
            var priceDiv=$('.prices');
            var catagory="";
            var cata=$(".globalMastheadCategorySelected");
            if(cata['0'])
            {
                cata['0'].children.filter(obj=>obj.name=='a').map(child=>{
                    //console.log(child)
                    child.children.map(child=>{
                        catagory=child.data
                    })
                    //stop
                })
            }


           
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
                        var diffPercent = (origPrice-salePrice)/origPrice*100


                        
                        if(diffPercent>75)

                        {
                            console.log('orig '+orig);
                            console.log('Sale '+sale);
                            var resultDesc = {
                                        desc:'',
                                        orig : orig.trim().replace('$',''),
                                        sale : sale.trim().replace('$',''),
                                        link:'',
                                        imgURL:''
                                    }
                            //console.log(priceDiv[index].parent);
                            var textwraper=priceDiv[index].parent.children;
                            var shortDesc=textwraper
                            .filter(obj=>obj.attribs && obj.attribs.class=='shortDescription')
                            .map(obj=> obj.children)[0];
                            if(shortDesc)
                            {
                                var link=shortDesc.filter(obj=> obj.name && obj.name=='a').map(l=>{
                                    
                                    resultDesc.desc=l.children && l.children[0] ? l.children[0].data.trim() : "no description"
                                    resultDesc.link=appendURL(l.attribs.href);
                                    //console.log(resultDesc,Object.keys(result).length);
                                })
                            }

                            var innerWrapper = priceDiv[index].parent.parent;
                            innerWrapper.children
                            .filter(obj=>obj.attribs && obj.attribs.class=='fullColorOverlayOff')
                            .map(fullColor=>{
                                //console.log('funll')
                                fullColor.children
                                .filter(obj=>obj.attribs && obj.attribs.class.includes('imageLink'))
                                .map(imgLink=>{
                                    imgLink.children
                                    .filter(obj=>obj.attribs && obj.attribs.id.includes('main_images_holder'))
                                    .map(mainImg=>{
                                        mainImg.children.filter(obj=>obj.name && obj.name=='img')
                                        .map(img=>{
                                            resultDesc.imgURL=img.attribs['data-src']
                                        })
                                    })
                                })
                            })
                            var salesRef=admin.database().ref('/sales');
                            if(catagory!="")
                            {
                                console.log(catagory);
                                salesRef=salesRef.child(catagory)
                            }
                            else
                            {
                                salesRef=salesRef.child('Others')
                            }
                            result[resultDesc.link]=resultDesc;
                            var postKey=salesRef.push().key
                            var updates = {}
                            updates[postKey] = resultDesc;
                            salesRef.update(updates);
                            if(Object.keys(result).length>10)
                            {
                                //console.log('reach here');
                                done()
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
                            //visited.push(finallink);
                            //console.log(finallink);
                        }

                    }
                    
                }
                    
            })
        }
        done();
    }
});

// entry url
c.queue({
    uri:'http://www1.macys.com/'
});