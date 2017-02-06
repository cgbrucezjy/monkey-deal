"use strict"
var admin = require("firebase-admin");
var ml = require("machine_learning");

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
  var desc=[]
  var catas=[]
  snap.forEach(function(merch){

    merch.forEach(function(child){
      console.log(child.key)
      child.forEach(function(item){
        var f=item.val()
        
        if(f.brandName && f.desc && f.cata)
        {
          var b=assignString(brandNames,f.brandName)
          var d=assignString(desc,f.desc)
          var c=assignString(catas,f.cata)
          feature=[b,d,c,f.dif,f.orig,f.sale]
          data.push(feature)
          id.push(item)
        }
        
      })
  })

  })
  var result = ml.kmeans.cluster({
      data : data,
      k : 5,
      epochs: 100,

      distance : {type : 'euclidean'},
      init_using_data:true
      // default : {type : 'euclidean'}
      // {type : 'pearson'}
      // Or you can use your own distance function
      // distance : function(vecx, vecy) {return Math.abs(dot(vecx,vecy));}
  });

  result.clusters.map((c,i)=>{
    c.map(index=>{
      var updates={}
      updates[id[index].key]=id[index].val()
      
      admin.database().ref('clusters').child('cluster'+i).update(updates)
    })
    
  })

console.log("clusters : ", result.clusters);
console.log("means : ", result.means);
});

function assignString(arr,s)
{
  if(arr.length==0)
  {
    arr.push(s)
    return 0;
  }
  var max= arr
      .map(b=>similarity(b,s))
      .reduce((prev,curr,index)=>curr>prev?curr:prev)
  if(max<0.5)
  {
    //add new value to the arry
    arr.push(s)
    return arr.length-1
  }
  else
  {
    //find the index in the array
    var index=-1;
    arr.map((b,i)=>{
      if(similarity(b,s)==max)
      {
        index=i;
      }
    })
    return index;
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