var Crawler = require("crawler");
var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var url = require('url');

var visited ={};
var result = {};
var specialCata=[]
var exclude =['Women\'s Apparel'];
var defaultURL='http://www.saksfifthavenue.com/';
var threshold=60
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
            console.log(res.options.uri)
            if(typeof($)=='function')
            {
                var title=$("title").text();
                console.log('title : '+title);

                var productDiv=$('.pa-product-large.sfa-pa-product-with-swatches');
                var catagory="";
                var searchQ=$("#search-query");
                var cata=[];
            
                if(searchQ['0'])
                {
                    searchQ['0'].children.filter(obj=>obj.name && obj.name=='a')
                    .map(c=>{
                        c.children.filter(obj=>obj.name && obj.name=='span')
                        .map(obj=>{
                            cata.push(obj.children[0].data.trim())
                            
                        })
                    })
                    searchQ['0'].children.filter(obj=>obj.name && obj.name=='span')
                    .filter(obj=> obj.attribs && obj.attribs.id && obj.attribs.id.includes('bccurrent'))
                    .map(c=>{
                        cata.push(c.children[0].data.trim())
                    })

                    console.log(cata)
                }
                if(cata[2])
                {
                    var resultDesc = {
                                    brandName:'',
                                    dif:'',
                                    desc:'',
                                    orig : '',
                                    sale : '',
                                    link:'',
                                    imgURL:'',
                                    subcata:cata[2],
                                    cata:catagory
                                }
                    productDiv.map(index=>{
                        resultDesc = {
                                    brandName:'',
                                    dif:'',
                                    desc:'',
                                    orig : '',
                                    sale : '',
                                    link:'',
                                    imgURL:'',
                                    subcata:cata[2],
                                    cata:catagory
                                }
                        var productText = productDiv[index].children
                        .filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='product-text')
                        productText=productText[0].children.filter(obj=>obj.name && obj.name=='a')[0]
                        resultDesc.link=productText.attribs.href
                        productText.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('product-price'))
                        .map(c=>{
                            resultDesc.orig=convertPriceFromString(c.children[0].data)
                        })
                         productText.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('sfa-sale-price-label'))
                        .map(c=>{
                            c.children.filter(obj=>obj.name && obj.name=='span')
                            .map(child=>{
                                
                                resultDesc.sale=convertPriceFromString(child.children[0].data)
                            })
                        })
                        productText.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('description'))
                        .map(c=>{
                            resultDesc.desc=c.children[0].data.trim()
                        })                  
                        if(visited[cata[1]])
                        {

                        }
                        else
                        {
                            visited[cata[1]]=[]
                        }
                        if(resultDesc.orig && resultDesc.sale && visited[cata[1]].indexOf(resultDesc.desc)==-1)
                        {
                            resultDesc.dif=(resultDesc.orig-resultDesc.sale)/resultDesc.orig*100
                            //console.log(resultDesc.dif)
                            visited[cata[1]].push(resultDesc.desc)
                            
                            if(exclude.indexOf(cata[1])!=-1)
                            {
                                //console.log(cata[1],exclude[0])
                                threshold=75
                            }
                            else
                            {
                                threshold=65
                            }
                            if(resultDesc.dif>threshold)
                            {

                                
                                productText.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('sfa-product-designer-name-container'))
                                .map(c=>{
                                    c.children.filter(obj=>obj.name && obj.name=='span')
                                    .map(child=>{
                                        resultDesc.brandName=child.children[0].data.trim()
                                    })
                                }) 
                                productDiv[index].children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class.includes('image-container-large'))
                                .map(child=>{
                                    child.children.filter(obj=>obj.name && obj.name=='a')
                                    .filter(obj=>obj.attribs && obj.attribs.id && obj.attribs.id.includes('image-url'))
                                    .map(img=>{
                                        img.children.filter(obj=>obj.name && obj.name=='img')
                                        .map(i=>{
                                            resultDesc.imgURL=i.attribs.src
                                        })
                                    })
                                })
                                if(cata[1]!="")
                                {
                                    console.log(resultDesc);
                                    var salesRef=admin.database().ref('/saks');
                                    salesRef=salesRef.child(cata[1])
                                    result[resultDesc.link]=resultDesc;
                                    var postKey=salesRef.push().key
                                    var updates = {}
                                    updates[postKey] = resultDesc;
                                    salesRef.update(updates);
                                }                               
                            }
                        }
                        var next=$('li.pa-enh-pagination-right-arrow') 
                        if(next[0])
                        {
                            next[0].children.filter(obj=>obj.name && obj.name =='a')
                            .map(link=>{
                                c.queue({
                                    uri:appendURL(link.attribs.href)
                                }) 
                            })
                                
                        }
                        
                    })
                }
                else
                {
                    if(cata[1])
                    {
                        //push actual links
                        console.log('reach')
                        var leftContainer =$('.left-nav-links-container');
                        leftContainer[0].children.filter(obj=>obj.name && obj.name=='li')
                        .map(li=>{
                            console.log(appendURL(li.children.filter(obj=>obj.name && obj.name=='a')[0].attribs.href))
                            c.queue({
                                        uri:appendURL(li.children.filter(obj=>obj.name && obj.name=='a')[0].attribs.href)
                                    }) 
                        })

                    }
                }


            }

      
        }
        done();
}
var c = new Crawler({
    maxConnections : 10,
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
// c.queue({
//     uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306642743+1553'
// });
c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418048+1553'
});

c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306622397+1553'
});
c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306622828+1553'
});

c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418050+1553'
});
c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418051+1553'
});

c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418052+1553'
});
c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418053+1553'
});

c.queue({
    uri:'http://www.saksfifthavenue.com/search/EndecaSearch.jsp?N=306418054+1553'
});
c.on('drain',function(){
    // For example, release a connection to database.
    console.log('done')// close connection to MySQL
});