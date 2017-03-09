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
var exclude =['https://www.farfetch.com/shopping/women/sale//items.aspx','https://www.farfetch.com/shopping/men/sale//items.aspx','customerservice-bloomingdales','account','creditservice','.jsp'];
var defaultURL='https://www.farfetch.com';
var threshold=70
var appendURL= function(url){
    
    return url.includes('http') ? url : defaultURL+url;
}

var appendTail=function(url){
    return url+'?on_sale=1&sort_field=insert_time&q=&limit=120&skip=0'
}

var convertPriceFromString = function(p){
    //console.log(p);
    p=p.replace(',','')
    p=p.replace('$','')
    return parseFloat(p.trim());
}
var callback=function(error, res, done){
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            console.log(res.options.uri)
            if(typeof($)=='function')
            {
                var title=$("title").text();
                console.log('title : '+title);

                var productDiv=$('article');
                var catagory="";
                var cata=$(".breadcrumbs-listItem a");


                if(cata['4'])
                {
                    catagory=cata['3'].children.filter(obj=> obj.name && obj.name=='span')[0].children[0].data.trim()
                    productDiv.map(index=>{
                        var dif;
                        var resultDesc = {
                                    brandName:'',
                                    dif:'',
                                    desc:'',
                                    orig : '',
                                    sale : '',
                                    link:'',
                                    imgURL:'',
                                    gender:cata['1'].children.filter(obj=> obj.name && obj.name=='span')[0].children[0].data.trim(),
                                    subcata:cata['4']?cata['4'].children.filter(obj=> obj.name && obj.name=='span')[0].children[0].data.trim():'',
                                    cata:catagory
                                }
                        productDiv[index].
                        children
                        .filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('listing-item-image'))
                        .map(imgDiv=>{
                            
                            imgDiv.children.filter(obj=>obj.name && obj.name=='a')
                            .map(imgAnchor=>{
                                resultDesc.link=appendURL(imgAnchor.attribs.href);
                                imgAnchor.children.filter(obj=>obj.name && obj.name=='img')
                                .map(img=>{
                                    
                                    resultDesc.imgURL=img.attribs['data-img'];
                                })
                            })

                            
                        })

                        productDiv[index].
                        children.filter(obj=>obj.name && obj.name=='a')
                        .filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('listing-item-content'))
                        .map(child=>{
                            child.children.filter(obj=>obj.attribs && obj.attribs.itemprop && obj.attribs.itemprop=='offerDetails')
                            .map(c=>{
                                c.children.filter(obj=>obj.attribs && obj.attribs && obj.attribs.class.includes('strike'))
                                .map(orig=>{
                                    resultDesc.orig=convertPriceFromString(orig.children[0].data)
                                })
                                c.children.filter(obj=>obj.attribs && obj.attribs && obj.attribs.class.includes('listing-item-content-sale'))
                                .map(sale=>{
                                    resultDesc.sale=convertPriceFromString(sale.children[0].data)
                                })
                                
                            })
                            dif=(resultDesc.orig-resultDesc.sale)/resultDesc.orig*100
                            if(dif && dif>threshold)
                            {
                                resultDesc.dif=dif
                                child.children.filter(obj=>obj.attribs && obj.attribs.itemprop && obj.attribs.itemprop=='brand')
                                .map(c=>{
                                    resultDesc.brandName=c.children[0].data
                                })
                                child.children.filter(obj=>obj.attribs && obj.attribs.itemprop && obj.attribs.itemprop=='name')
                                .map(c=>{
                                    resultDesc.desc=c.children[0].data
                                })
                                if(catagory!="")
                                {
                                    console.log(resultDesc);
                                    var salesRef=admin.database().ref('/farfetch');
                                    salesRef=salesRef.child(catagory)
                                    result[resultDesc.link]=resultDesc;
                                    var postKey=salesRef.push().key
                                    var updates = {}
                                    updates[postKey] = resultDesc;
                                    salesRef.update(updates);
                                }
                            }
                        })
                        
                    })
                }
                else
                {
                    if(cata['3'] && cata['3'].children.filter(obj=> obj.name && obj.name=='span')[0].children[0])
                    {
                        //push actual links
                        console.log('reach')
                        var inputs =$('li a');
                        inputs
                        .map(index=>{
                            var currItem=inputs[index]
                            if(currItem.attribs && currItem.attribs.id && currItem.attribs.id.includes('category'))
                            {
                                console.log('second' ,appendURL(currItem.attribs.href))
                                if(exclude.indexOf(currItem.attribs.href)==-1)
                                {
                                    c.queue({
                                        uri:appendURL(currItem.attribs.href)
                                    }) 
                                }
                                
                            }
                            
                            
                        })
                    }
                    else
                    {
                        //push one more round
                       if(cata['3'])
                       {
                        var inputs =$('li a.tree-title');
                        
                            inputs
                            .map(index=>{
                                var currItem=inputs[index]

                                var weight1Link=appendURL(currItem.attribs.href) 
                                console.log('first',weight1Link)
                                if(exclude.indexOf(weight1Link)==-1)
                                {
                                    c.queue({
                                            uri:weight1Link
                                        }) 
                                }
                                

                            })
                       }

                    }
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
    uri:'https://www.farfetch.com/shopping/women/sale/all/items.aspx?ffref=lnp_mod5'
});

c.queue({
    uri:'https://www.farfetch.com/shopping/men/sale/all/items.aspx?ffref=lnp_mod5'
});

c.on('drain',function(){
    // For example, release a connection to database.
    console.log('done')// close connection to MySQL
});