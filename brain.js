var cluster = require('hierarchical-clustering');

var admin = require("firebase-admin");
var serviceAccount = require("./service-account.json");

//console.log(userAgents);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:  "https://monkey-deal-5cd79.firebaseio.com"
});

var id=[]
var data=[];
var feature=[];
admin.database().ref().once('value',function(snap){
  var brandNames=[]
  var brandNameExist=[]
  var desc=[]
  var descExist=[]
  var catas=[]
  var catasExist=[]
  snap.forEach(function(merch){

    merch.forEach(function(child){
      console.log(child.key)
      child.forEach(function(item){
        var f=item.val()
        
        if(f.brandName && f.desc && f.cata && f.orig<10000)
        {
            var b=assignString(brandNames,f.brandName,brandNameExist)
            var d=assignString(desc,f.desc,descExist)
             var c=assignString(catas,f.cata,catasExist)
            feature=[b,d,c,f.dif,f.orig,f.sale]
            console.log(feature)
            data.push(feature)
            id.push(item)
        }
        
      })
  })

  })
    var levels = cluster({
        input: data,
        distance: distance,
        linkage: linkage,
        minClusters: 10, // only want two clusters 
    });
    
    var clusters = levels[levels.length - 1].clusters;
    console.log(clusters);
    // => [ [ 2 ], [ 3, 1, 0 ] ] 
    

  clusters.map((c,i)=>{
    c.map(index=>{
      var updates={}
      updates[id[index].key]=id[index].val()
      
      admin.database().ref('clusters').child('cluster'+i).update(updates)
    })
    
  })
});
 
// Euclidean distance 
function distance(a, b) {
  var d = 0;
  for (var i = 0; i < a.length; i++) {
    d += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(d);
}
 
// Single-linkage clustering 
function linkage(distances) {
  return Math.max.apply(null, distances);
}
 

 function assignString(arr,s,existVal)
{
  if(arr.length==0)
  {
    var item={
        desc:s,
        value:Math.floor(Math.random() * 1000)+0
    };
    existVal.push(item.value)
    arr.push(item)
    return item.value;
  }
  var max= arr
      .map(item=>item.desc)
      .map(b=>similarity(b,s))
      .reduce((prev,curr,index)=>curr>prev?curr:prev)
  if(max<0.5)
  {
    //add new value to the arry
    var value=Math.floor(Math.random() * 1000)+0
    while(existVal.indexOf(value)!=-1)
    {
        value=Math.floor(Math.random() * 1000)+0
    }
    var item={
        desc:s,
        value:value
    };
    arr.push(item)
    existVal.push(item.value);
    return item.value
  }
  else
  {
    //find the index in the array
    var index=-1;
    arr.map(item=>item.desc).map((b,i)=>{
      if(similarity(b,s)==max)
      {
        index=i;
      }
    })
    return arr[index].value;
  }
}



function similarity(s1, s2) {
  //console.log(s1,s2)
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
