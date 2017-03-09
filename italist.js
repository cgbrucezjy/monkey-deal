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
var defaultURL='https://www.italist.com';
var threshold=45
var appendURL= function(url){
    
    return url.includes('http') ? url : defaultURL+url;
}

var appendTail=function(url){
    return url+'?on_sale=1&sort_field=insert_time&q=&limit=120&skip=0'
}

var convertPriceFromString = function(p){
    //console.log(p);
    p=p.replace(',','')
    p=p.replace('€','')
    return parseFloat(p.trim().match(/\d.+/)[0]);
}

var genderRefine = function(g)
{
    return g.replace('Woman','Women').replace('Man','Men')
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

                var productDiv=$('.single_product');
                var catagory="";
                var cata=$(".navigation_path a");
                //console.log(cata['0'])


                if(cata['3'])
                {
                    catagory=cata['2'].children[0].data.trim()
                    productDiv.map(index=>{
                        var dif;
                        var filterDiv=productDiv[index].children.filter(obj=>obj.name && obj.name=='div')[0]
                        
                        filterDiv.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='labelSale')
                        .map(c=>{
                            dif=parseInt(c.children[0].data.trim().replace('%',''))
                        })

                        if(dif && dif>threshold)
                        {
                            var resultDesc = {
                                    brandName:'',
                                    dif:'',
                                    desc:'',
                                    orig : '',
                                    sale : '',
                                    link:'',
                                    imgURL:'',
                                    subcata:cata['3'].children[0].data.trim(),
                                    gender:genderRefine(cata['1'].children[0].data.trim()),
                                    cata:catagory
                                }
                            filterDiv.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='single_product_price')
                            .map(child=>{
                                resultDesc.orig=convertPriceFromString(child.children[0].children[0].data)
                                resultDesc.sale=convertPriceFromString(child.children[1].data)
                            })
                            filterDiv.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='single_product_brand')
                            .map(child=>{
                                resultDesc.brandName=child.children.filter(obj=>obj.name && obj.name=='h2')[0].children[0].data;
                            })    
                            filterDiv.children.filter(obj=>obj.attribs && obj.attribs.class && obj.attribs.class=='single_product_model')
                            .map(child=>{
                                resultDesc.desc=child.children.filter(obj=>obj.name && obj.name=='a')[0].children.filter(obj=>obj.name && obj.name=='h2')[0].children[0].data                            
                            })  
                            var imgDiv=productDiv[index].children.filter(obj=>obj.name && obj.name=='a')[0]    
                            resultDesc.link=appendURL(imgDiv.attribs.href)
                            var imgURL=imgDiv.children[1].attribs.style
                            imgURL=imgURL.substring(imgURL.indexOf('url(\'')+5,imgURL.indexOf('\')')).replace('_mini','_medium')   
                            resultDesc.imgURL=imgURL;   
                            resultDesc.dif=dif; 
                            if(catagory!="")
                            {
                                console.log(resultDesc);
                                var salesRef=admin.database().ref('/italist');
                                salesRef=salesRef.child(catagory)
                                result[resultDesc.link]=resultDesc;
                                var postKey=salesRef.push().key
                                var updates = {}
                                updates[postKey] = resultDesc;
                                salesRef.update(updates);
                            }

                        }
                        //debug
                    })
                }
                else
                {
                    if(cata['2'])
                    {
                        //push actual links
                        var inputs =$('.weight_2 .checkbox');

                        inputs
                        .map(index=>{
                            var currItem=inputs[index]
                            currItem.children.filter(obj=>obj.name=='input')
                            .map(obj=>{
                                var weight2Link=appendURL(appendTail(obj.attribs.value)) 
                                c.queue({
                                            uri:weight2Link
                                        }) 
                            })
                        })
                    }
                    else
                    {
                        //push one more round
                       var inputs =$('.weight_1 .checkbox');

                        inputs
                        .map(index=>{
                            var currItem=inputs[index]
                            currItem.children.filter(obj=>obj.name=='input')
                            .map(obj=>{
                                var weight1Link=appendURL(appendTail(obj.attribs.value)) 
                                //console.log(weight1Link)
                                c.queue({
                                            uri:weight1Link
                                        }) 
                            })
                        })
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
    uri:'https://www.italist.com/en/woman/1/?on_sale=1'
});

c.queue({
    uri:'https://www.italist.com/en/man/124/?on_sale=1'
});

c.on('drain',function(){
    // For example, release a connection to database.
    console.log('done')// close connection to MySQL
});