

//Global Variables

var writeQueries = false;

var draggable;
var lastTouched = -1;

var margin = {top: 8, right: 10, bottom: 2, left: 10};

var parseDate = d3.time.format("%x").parse;

var width;
var height;
var x;

var rectWidth;
var searchCanvas;
var cHeight;
var bounds;

var query;
var sparseQuery;
var queryRange;
var queryMin;
var queryMax;

var name;
var time;
var value;
var parseD;

var drawing = false;
var dMode = 0;
var context;
var oldX,oldY = 0;
var queryY = d3.scale.linear().domain([0,150]);
var hitColorScale = d3.scale.quantize().domain([0,-100]).range(colorbrewer.RdYlGn[9]);
var windowColorScale = d3.scale.quantize().range(colorbrewer.RdYlGn[9]);

var rwidth;
var rX;
var rY;

//How much space to devote to "empty" (as opposed to 0) values in the sketch UI
var nanHeight = 3;

var searchMode = 0;
var votes;
var voteBuffer = 1.0;
var voteScale = 0.25;

var resultMode = 0;
var sendData;

var symbols;

//Data loading and initialization

function load(){
  width = document.getElementById("multiples").scrollWidth,
  height = 30 - margin.top - margin.bottom;

  x = d3.time.scale()
  .range([0, width]);
  
  var datasrc = gup('data');
  name = getNameString();
  time = getTimeString();
  value = getValueString();
  parseD = function(d){ return +d;};
  if(gup('time')=='date'){
    parseD = function(d){ return parseDate(d); };
  }
  datasrc = datasrc ? 'datasets/'+datasrc+'.csv' : 'datasets/onemilliontop1k1800.csv';
  
  d3.csv(datasrc,function(row){ row[value] = +row[value]; row[time] = parseD(row[time]); return row;},function(data){ doneLoad(data);});
};

function doneLoad(rawData){
  var symbols = d3.nest()
  .key(function(d){ return d[name]; })
  .entries(rawData);
  
  x.domain([
            d3.min(symbols, function(symbol) { return symbol.values[0][time];}),
            d3.max(symbols, function(symbol) { return symbol.values[symbol.values.length - 1][time]; })
            ]);
  
  
  var svg = d3.select("#multiples").selectAll("svg")
  .data(symbols)
  .enter().append("svg")
  .attr("width", width)
  .attr("height", height + margin.top + margin.bottom)
  .attr("id",function(symbol){ return "key"+symbol.key;})
  .attr("ondblclick","transferQuery(event)")
  .attr("ontouchstart","touchInit(event)")
  .attr("ontouchend","touchTransfer(event)")
  .append("g")
  .attr("transform", "translate(" + 0  + "," + margin.top + ")")
  .each(function(symbol,i) {
        
        symbol.y = d3.scale.linear()
        .domain(d3.extent(symbol.values,function(d){return d[value];}))
        .range([height, 0]);
        
        symbol.rankOrder = i;
        symbol.bestX = 0;
        symbol.bestHit = 1;
        
        });
  
  svg.append("path")
  .attr("class", "area")
  .attr("d", function(symbol) {
        return d3.svg.area()
        .x(function(d) { return x(d[time]); })
        .y1(function(d) { return symbol.y(d[value]); })
        .y0(height)
        (symbol.values);
        });
  
  svg.append("path")
  .attr("class", "line")
  .attr("d", function(symbol) {
        return d3.svg.line()
        .x(function(d) { return x(d[time]); })
        .y(function(d) { return symbol.y(d[value]); })
        (symbol.values);
        });
  
  svg.append("text")
  .attr("x", width - margin.right - 6)
  .attr("y", 6)
  .attr("fill","#000")
  .style("text-anchor", "end")
  .style("stroke","#fff")
  .style("stroke-width","2")
  .text(function(symbol) { return symbol.key; });
  
  svg.append("text")
  .attr("x", width - margin.right - 6)
  .attr("y", 6)
  .attr("fill","#000")
  .style("text-anchor", "end")
  
  .text(function(symbol) { return symbol.key; });
  
  
  rwidth = d3.select("#results").node().scrollWidth - 20;
  rX = d3.time.scale();
  rX.domain([
             d3.min(symbols, function(symbol) { return symbol.values[0][time];}),
             d3.max(symbols, function(symbol) { return symbol.values[symbol.values.length - 1][time]; })
             ]);
  rX.range([0,rwidth]);
  
  //Make Visual Query Area
  
  var xAxis = d3.svg.axis().orient("top").scale(rX).tickSize(10).tickFormat(getFormat()).ticks(20);
  
  d3.select("#search")
  .append("svg")
  .attr("width", rwidth)
  .attr("height","25")
  .append("g")
  .attr("transform","translate(0,25)")
  .attr("class","xaxis")
  .call(xAxis);
  
  d3.select("#search")
  .append("canvas")
  .attr("id","queryCanvas")
  .attr("width",rwidth)
  .attr("height",document.getElementById("search").clientHeight-25);
  
  d3.select("#searchUI")
  .append("button")
  .attr("onclick","search()")
  .attr("class","searchbtn")
  .text("")
  .append("img")
  .attr("src","imgs/search.png");
  
  d3.select("#searchUI")
  .append("button")
  .attr("onclick","resetQuery()")
  .attr("id","clearBtn")
  .text("")
  .append("img")
  .attr("src","imgs/clear.png");
  
  d3.select("#searchUI")
  .append("button")
  .attr("onclick","drawMode()")
  .attr("id","drawBtn")
  .text("")
  .append("img")
  .attr("src","imgs/draw-active.png");
  
  d3.select("#searchUI")
  .append("button")
  .attr("onclick","eraseMode()")
  .attr("id","eraseBtn")
  .text("")
  .append("img")
  .attr("src","imgs/erase.png");
  
  searchCanvas = document.getElementById("queryCanvas");
  context = searchCanvas.getContext("2d");
  
  devicePixelRatio = window.devicePixelRatio || 1,
  backingStoreRatio = context.webkitBackingStorePixelRatio ||
  context.mozBackingStorePixelRatio ||
  context.msBackingStorePixelRatio ||
  context.oBackingStorePixelRatio ||
  context.backingStorePixelRatio || 1,
  ratio = devicePixelRatio / backingStoreRatio;
  
  
  retinaFix();
  
  var searchArea = document.getElementById("search");
  searchArea.addEventListener("mousedown",mouseDown,false);
  searchArea.addEventListener("mouseup",mouseUp,false);
  searchArea.addEventListener("mousemove",mouseMove,false);
  searchArea.addEventListener("mouseleave",mouseLeave,false);
  
  searchArea.addEventListener("touchstart",mouseDown,false);
  searchArea.addEventListener("touchmove",mouseMove,false);
  searchArea.addEventListener("touchend",mouseUp,false);
  searchArea.addEventListener("touchleave",mouseLeave,false);
  
  bounds = searchCanvas.getBoundingClientRect();
  makeVotes();
  
  
  // prevent elastic scrolling
  searchArea.addEventListener('touchmove',function(event){
                              event.preventDefault();
                              },false);  // end body:touchmove
  
  //Initialize query
  query = new Array(searchCanvas.width+1);
  sparseQuery = new Array();
  for(var i = 0;i<query.length;i++){
    query[i] = -1;
  }
  
  rY = d3.scale.linear().domain([0,height]).range([cHeight,0]);
  resetQuery();
  
  d3.select("#loading").attr("style","visibility:hidden;");
}



//Utility functions
function gup(vName){
  var pattern = new RegExp( "[\\?&]"+vName+"=([^&#]*)");
  var results = pattern.exec(location.href);
  return results ? results[1] : null ;
}

function getFormat(){
  var time = gup('time');
  var format = time&&time=='date' ? d3.time.format("%m/%Y") : d3.format("d");
  return format;
}

function getNameString(){
  var name = gup('name');
  var nString = name ? name : 'word';
  return nString;
}
function getTimeString(){
  var time = gup('time');
  var tString = time ? time : 'date';
  return tString;
}

function getValueString(){
  var val = gup('value');
  var vString = val ? val : 'freq';
  return vString;
}

function resize(){
  margin = {top: 8, right: 10, bottom: 2, left: 10};
  width = document.getElementById("multiples").scrollWidth;
  height = 30 - margin.top - margin.bottom;
  rwidth = d3.select("#results").node().scrollWidth - 20;
  
  searchCanvas.width = rwidth;
  searchCanvas.height = document.getElementById("search").clientHeight-25;
  
  retinaFix();
  bounds = searchCanvas.getBoundingClientRect();
  
  
  rY = d3.scale.linear().domain([0,height]).range([cHeight,0]);
  resetQuery();
  makeVotes();
  
}

function retinaFix(){
  //Deal with pesky retina displays
  if(devicePixelRatio !== backingStoreRatio){
    var canvasWidth = searchCanvas.width;
    var canvasHeight = searchCanvas.height;
    searchCanvas.width = canvasWidth * ratio;
    searchCanvas.height = canvasHeight * ratio;
    searchCanvas.style.width = canvasWidth + "px";
    searchCanvas.style.height = canvasHeight + "px";
    context.scale(ratio,ratio);
    cHeight = canvasHeight;
  }
}

function type(d) {
  d[value] = +(d[value]);
  d[time] = parseD(d[time]);
  return d;
}


//Search functions


function search(){
  d3.select("#loading").attr("style","visiblity: visible;");
  queryRange = 0;
  queryMin = -1;
  queryMax = -1;
  for (var i = 0;i<query.length;i++){
    if(query[i]!=-1){
      if(queryMin==-1)
        queryMin = i;
      queryMax = i;
    }
    
  }
  
  //console.log(symbol.key+" query goes from "+queryMin+"-"+queryMax);
  queryRange = queryMax-queryMin;
  
  var start = new Date().getTime();
  if(document.getElementById("queryMode").value==0){
    d3.select("#multiples").selectAll("svg").each(function(symbol){minDiff(symbol);});
  }
  else if(document.getElementById("queryMode").value==1){
    d3.select("#multiples").selectAll("svg").each(function(symbol){houghTransform(symbol);});
  }
  else{
    d3.select("#multiples").selectAll("svg").each(function(symbol){DTW(symbol);});
  }
  var end = new Date().getTime();
  var queryDuration = end-start;
  console.log("Query of size "+queryRange+" completed in "+queryDuration+" msecs");
  d3.select("#loading").attr("style","visibility:hidden;");
  fromDiffToRank();
  hitColorScale.domain([d3.select("#multiples").select("svg:last-child").datum().bestHit,d3.select("#multiples").select("svg").datum().bestHit]);
  updateColors();
  result(document.getElementById("n").value);
}

function inRangeResults(symbol){
  //Give me just the data values that fell into the window I found with the best match
  var inRangeValues = new Array();
  for(var i = 0;i<symbol.values.length;i++){
    if(rX(symbol.values[i][time])>symbol.bestX - (queryRange/2.0) && rX(symbol.values[i][time])<symbol.bestX+(queryRange/2.0)){
      inRangeValues.push(symbol.values[i]);
    }
  }
  return inRangeValues;
}

function result(n){
  //Puts the top n results in the main pane. Tells the DB what query I made and on what dataset.
  
  //get rid of the old results
  d3.select("#results").selectAll("svg").remove();
  
  
  var topN = [];
  var rheight =   ((d3.select("#results").node().scrollHeight-70) / n) ;
  var cursvg;
  var curY;
  
  var results = d3.select("#multiples").selectAll("svg").filter(function(d,i){ return d.rankOrder<n; });
  
  //Okay, this next section is a little weird. Essentially, we have four cases:
  //1a) We are doing juxtaposition of results (one graph per result)
  //1b) We matched a REGION rather than a whole series, so we need to draw where we matched (and how well)
  //2a) We are doing superposition of results (one graph for all n results)
  //2b) Matched a REGION, so we draw where we matched.
  
  if(document.getElementById("resultMode").value==1){
    rheight = d3.select("#results").node().scrollHeight-30;
    cursvg = d3.select("#results").append("svg")
    .attr("width",rwidth)
    .attr("height",rheight);
    
    results.each(function(symbol,i){
                 curY = d3.scale.linear()
                 .domain([d3.min(symbol.values, function(d){return d[value];}), d3.max(symbol.values, function(d) { return d[value]; })])
                 .range([rheight, 0]);
                 
                 var cindex;
                 if(i%2==0){
                 cindex=i;
                 }
                 else{
                 cindex = 9-i;
                 }
                 cursvg.append("g")
                 .append("path")
                 .attr("fill-opacity",0)
                 .attr("stroke-width",1.5)
                 .attr("stroke",colorbrewer.RdBu[10][cindex])
                 .attr("title",symbol.key)
                 .attr("d", function(d) {
                       return d3.svg.line()
                       .x(function(d) { return rX(d[time]); })
                       .y(function(d) { return curY(d[value]); })
                       (symbol.values);
                       });
                 
                 
                 if(document.getElementById("XPos").checked){
                 if(document.getElementById("queryMode").value=="0"){
                 windowColorScale.domain([d3.select("#multiples").select("svg:last-child").datum().bestHit,0]);
                 }
                 else if(document.getElementById("queryMode").value=="1"){
                 windowColorScale.domain([0,queryRange*voteScale]);
                 }
                 cursvg.append("g")
                 .append("path")
                 .attr("stroke",windowColorScale(symbol.bestHit))
                 .attr("fill-opacity",0)
                 .attr("stroke-width",3)
                 .attr("d", function(d) {
                       return d3.svg.line()
                       .x(function(d) { return rX(d[time]); })
                       .y(function(d) {
                          
                          return curY(d[value]);
                          
                          })
                       (inRangeResults(symbol));
                       });
                 }
                 
                 
                 topN.push(symbol.key);
                 });
    
  }
  else{
    results.each(function(symbol){
                 //  console.log(symbol.key+" has a -MSE of "+symbol.bestHit+" over "+symbol.values.length+" points");
                 curY = d3.scale.linear()
                 .domain([d3.min(symbol.values, function(d){return d[value];}), d3.max(symbol.values, function(d) { return d[value]; })])
                 .range([rheight, 0]);
                 
                 cursvg = d3.select("#results").append("svg")
                 .attr("width", rwidth)
                 .attr("height", rheight)
                 
                 cursvg.append("g")
                 .append("path")
                 .attr("class", "area")
                 .attr("fill","#333")
                 .attr("d", function(d) {
                       return d3.svg.area()
                       .x(function(d) { return rX(d[time]); })
                       .y1(function(d) { return curY(d[value]); })
                       .y0(rheight)
                       (symbol.values);
                       });
                 
                 
                 
                 
                 if(document.getElementById("XPos").checked){
                 if(document.getElementById("queryMode").value=="0"){
                 windowColorScale.domain([d3.select("#multiples").select("svg:last-child").datum().bestHit,0]);
                 }
                 else if(document.getElementById("queryMode").value=="1"){
                 windowColorScale.domain([0,queryRange*voteScale]);
                 }
                 cursvg.append("g")
                 .append("path")
                 .attr("fill",windowColorScale(symbol.bestHit))
                 .attr("d", function(d) {
                       return d3.svg.area()
                       .x(function(d) { return rX(d[time]); })
                       .y1(function(d) {
                           
                           return curY(d[value]);
                           
                           })
                       .y0(rheight)
                       (inRangeResults(symbol));
                       });
                 }
                 
                 
                 cursvg.append("text")
                 .attr("x", rwidth - 6)
                 .attr("y",11)
                 .style("stroke","#fff")
                 .style("stroke-width","2")
                 .attr("fill","#000")
                 .style("text-anchor", "end")
                 .text(symbol.key);
                 
                 cursvg.append("text")
                 .attr("x", rwidth - 6)
                 .attr("y",11)
                 .attr("fill","#000")
                 .style("text-anchor", "end")
                 .text(symbol.key);//function(symbol) { return symbol.key; });
                 
                 topN.push(symbol.key);
                 
                 
                 });
  }
  
  if(writeQueries){
    saveQuery(topN);
  }
  
}

function saveQuery(topN){
  var queryString = "";
  for(var i = 0;i<query.length-1;i++){
    queryString+=(query[i]+",");
  }
  queryString+=query[query.length-1];
  
  var commentString = "Top "+n+" results: ";
  for(var i=0;i<n-1;i++){
    commentString+=topN[i]+",";
  }
  commentString+=topN[n-1];
  var datasetString = gup('data');
  if(datasetString=="")
    datasetString="onemilliontop1k1800";
  
  sendData = {query: queryString, comments: commentString, mode: 0, dataset: datasetString, notes: "CHI Testing"};
  
  
  $.ajax
  ({
   type: "POST",
   url: 'db/queryOut.php',
   data: 'query='+sendData.query+"&comments="+sendData.comments+"&mode="+sendData.mode+"&dataset="+sendData.dataset+"&notes="+sendData.notes,
   cache: false,
   success: function(){
   //      alert("Submitted Query");
   },
   error: function(xhr,ajaxOptions, thrownError){
   alert(thrownError);
   }
   });
}

function drawMode(){
  dMode = 0;
  d3.select("#drawBtn").select("img").attr("src","imgs/draw-active.png");
  d3.select("#eraseBtn").select("img").attr("src","imgs/erase.png");
  
}

function eraseMode(){
  dMode = 1;
  d3.select("#drawBtn").select("img").attr("src","imgs/draw.png");
  d3.select("#eraseBtn").select("img").attr("src","imgs/erase-active.png");
  
}

function houghMode(){
  searchMode = 1;
  d3.select("#exactBtn").select("img").attr("src","imgs/exactmatch.png");
  d3.select("#eventBtn").select("img").attr("src","imgs/eventmatch-active.png");
}

function fullMode(){
  searchMode = 0;
  d3.select("#exactBtn").select("img").attr("src","imgs/exactmatch-active.png");
  d3.select("#eventBtn").select("img").attr("src","imgs/eventmatch.png");
}

function fromDiffToRank(){
  //Sorts each time series based on how well it matched, then tells the series its own index.
  d3.selectAll("#multiples").selectAll("svg").sort(function(a,b){
                                                   if(a.bestHit < b.bestHit)
                                                   return 1;
                                                   else if(a.bestHit > b.bestHit)
                                                   return -1;
                                                   else
                                                   return 0;
                                                   });
  d3.selectAll("#multiples").selectAll("svg").each(function(symbol,i){symbol.rankOrder = i;});
  
}

function resetDisplay(){
  d3.selectAll("#multiples").selectAll("svg").sort(function(a,b){
                                                   if(a.key < b.key)
                                                   return -1;
                                                   else if(a.key > b.key)
                                                   return 1;
                                                   else
                                                   return 0;
                                                   });
  d3.selectAll("#multiples").selectAll("svg").each(function(symbol,i){symbol.rankOrder = i;
                                                   symbol.bestHit = NaN;
                                                   symbol.bestX = 0;
                                                   });
  hitColorScale.domain([-1,0]);
  updateColors();
  
}

function resetVotes(){
  //Initializes our array of votes for Hough voting
  for(var i = 0;i<votes.length;i++){
    for(var j = 0;j<votes[i].length;j++){
      votes[i][j] = 0;
    }
  }
}

function makeVotes(){
  //Creates our array of votes for Hough voting
  votes = new Array(Math.floor(searchCanvas.width*voteScale));
  for(var i = 0;i<votes.length;i++){
    votes[i] = new Array(Math.floor((cHeight + Math.floor((2*voteBuffer)*cHeight))*voteScale));
  }
}


function houghTransform(symbol){
  //Hough Transform
  resetVotes();
  var signal;
  var smoothed;
  if(document.getElementById("Noise").checked){
    smoothed = lpf(symbol.values);
  }
  signal = symbol.values;
  //console.log(symbol.key);
  
  var yVoteScale = voteScale;
  if(document.getElementById("Amp").checked){
    //Deal with amplitude by just aliasing verticle accumulator cells, for now.
    yVoteScale/=2.0;
  }
  var curdiff = 0;
  var n = 0;
  var testX = 0;
  var vindex;
  var hindex;
  
  var curMax = 0;
  var curMaxX = 0;
  
  
  var startSearch = 0;
  var endSearch = signal.length;
  if(!document.getElementById("XPos").checked){
    var i = 0;
    testX = rX(signal[i][time]);
    while(testX<queryMin && i<signal.length-1){
      i++;
      testX = rX(signal[i][time]);
    }
    startSearch = i;
    var i = 0;
    testX = rX(signal[startSearch][time]);
    while(testX<queryMax && i<signal.length-1){
      i++;
      testX = rX(signal[i][time]);
    }
    endSearch = i;
  }
  var curVal;
  for(var i = startSearch;i<endSearch;i++){
    testX = Math.floor(rX(signal[i][time]));
    if(isNaN(query[testX])){
      console.log("query["+testX+"] is undefined");
    }
    
    for(var j=queryMin;j<queryMax;j++){
      if(query[j]!=-1){
        if(document.getElementById("Noise").checked){
          curVal = smoothed[i];
        }
        else{
          curVal = signal[i][value];
        }
        hindex = Math.floor((testX + ((queryRange/2.0)-(j-queryMin)))*voteScale);
        vindex = Math.floor((((cHeight/2.0) - query[j]) + rY(symbol.y(curVal))+(voteBuffer*cHeight))*yVoteScale);
        if(hindex>=0 && hindex<votes.length && vindex>0 && vindex<(votes[0].length)){
          votes[hindex][vindex]++;
          
          if(votes[hindex][vindex]>curMax){
            curMax = votes[hindex][vindex];
            curMaxX = hindex/voteScale;
          }
        }
        else{
          if(vindex<0 || vindex>votes[0].length){
            console.log("("+hindex+","+vindex+") is out of bounds, query[i]="+query[j]+", signal[i]="+rY(symbol.y(signal[i][value])));
          }
        }
      }
      
    }
    
  }
  
  //  console.log(symbol.key+" votes:"+curMax);
  symbol.bestX = curMaxX;
  symbol.bestHit = curMax;
  
}

function DTW(symbol){
  //Dynamic Time Warping
  //There's no way this will be fast enough, and since we will likely have big temporal jumps (for alignment, if that's what the query calls for) then we can't use FastDTW, alas.
  
  var signal = symbol.values;
  symbol.bestX = 0;
  if(document.getElementById("Noise").checked){
    var smoothed = lpf(signal);
  }
  //The LOCATION of the best hit for DTW is a little tricky.
  //I think it's probably where we stop making deletions or insertions and start making matches
  symbol.bestX = 0;
  symbol.bestHit = Number.MAX_VALUE;
  
  
  var DTWM = new Array(signal.length);
  for(var i = 0;i<DTWM.length;i++){
    DTWM[i] = new Array(query.length);
  }
  
  for(var i = 1;i<DTWM.length;i++){
    DTWM[i][0] = Number.MAX_VALUE;
  }
  
  for(var i = 1;i<DTWM[0].length;i++){
    DTWM[0][i] = Number.MAX_VALUE;
  }
  
  DTWM[0][0] = 0;
  
  var cost,icost,dcost,mcost,mincost;
  var curVal;
  var foundX = false;
  for(var i = 1;i<DTWM.length;i++){
    if(document.getElementById("Noise").checked){
      curVal = smoothed[i];
    }
    else{
      curVal = signal[i][value];
    }
    for(var j = 1;j<DTWM[i].length;j++){
      cost = Math.pow(rY(symbol.y(curVal))-query[j],2);
      icost = DTWM[i-1][j];
      dcost = DTWM[i][j-1];
      mcost = DTWM[i-1][j-1];
      mincost = d3.min(new Array(icost,dcost,mcost));
      if(j>1 && !foundX && mincost==mcost){
        bestX = i;
        foundX = true;
      }
      DTWM[i][j] = cost + mincost;
    }
  }
  symbol.bestHit = -1*  DTWM[signal.length-1][query.length-1];
  
}

function minDiff(symbol){
  //Mean Squared Error
  
  //  console.log("Searching "+symbol.key+" which has "+symbol.values.length+" entries");
  var signal = symbol.values;
  var smoothed = lpf(signal);
  
  //actually calculate diffs
  var curdiff = 0;
  var n = 0;
  var testX = 0;
  var startSearch = 0;
  var endSearch = 1;
  symbol.bestHit = Number.MAX_VALUE;
  symbol.bestX = 0;
  var curVal;
  var queryShift = 0;
  //Since query is meant to be denser than target, we need to shift the query and try it in every position, if we are doing partial matches.
  if(document.getElementById("XPos").checked){
    //start by "shoving" the query all the way to the left
    startSearch = -queryMin;
    //end by "shoving" all the way to the right
    endSearch = (rwidth-queryMax);
    
  }
  for(var j = startSearch;j<endSearch;j++){
    curdiff = 0;
    n = 0;
    for(var i = 0;i<signal.length;i++){
      if(document.getElementById("Noise").checked){
        curVal = smoothed[i];
      }
      else{
        curVal = signal[i][value];
      }
      testX = Math.round(rX(signal[i][time]));
      queryShift = testX - j;
      if(isNaN(query[queryShift])){
        //  console.log("query["+queryShift+"] is undefined");
      }
      if(!isNaN(query[queryShift]) && query[queryShift]!=-1){//queryShift > 0 && queryShift < query.length && query[queryShift]!=-1){
        n++;
        curdiff+=Math.pow(rY(symbol.y(curVal))-query[queryShift],2);
      }
      
    }
    //console.log(symbol.key+" MSE is "+curdiff+" over "+n+" points ("+curdiff/n+" normalized)");
    
    if(n>0 && (curdiff/n) < symbol.bestHit){
      symbol.bestHit = (curdiff/n);
      symbol.bestX = j + queryMin + (queryRange/2.0);
      symbol.bestN = n;
    }
    else{
      //  symbol.bestHit = -Number.MAX_VALUE;
    }
  }
  symbol.bestHit = -symbol.bestHit;
}

//Query Drawing
function mouseDown(m_event){
  if(!drawing){
    oldX = Math.round(m_event.pageX - bounds.left);
    oldY = Math.floor(cHeight - (bounds.bottom - m_event.pageY));
  }
  drawing = true;
}

function mouseMove(m_event){
  var mx = Math.floor(m_event.pageX - bounds.left);
  var my = Math.round(cHeight - (bounds.bottom - m_event.pageY));// -bounds.bottom;
  
  if(drawing){
    if(mx>searchCanvas.width){
      mx = searchCanvas.width;
    }
    else if(mx<0){
      mx = 0;
    }
    if(my<0){
      my = 0;
    }
    else if(my>cHeight){
      my = cHeight;
    }
    if(dMode==0){
      drawLine(mx,my);
    }
    else{
      eraseLine(mx,my);
    }
    
  }
  oldX = mx;
  oldY = my;
}


function drawLine(mx,my){
  //console.log(oldX+","+oldY+" "+mx+","+my);
  var qpoint =  {x: mx, y: cHeight-my};
  sparseQuery.push(qpoint);
  
  context.fillStyle = "#333";
  context.beginPath();
  context.moveTo(oldX,cHeight);
  context.lineTo(oldX,oldY);
  context.lineTo(mx,my);
  context.lineTo(mx,cHeight);
  context.closePath();
  context.fill();
  
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(oldX,0);
  context.lineTo(oldX,oldY);
  context.lineTo(mx,my);
  context.lineTo(mx,0);
  context.closePath();
  context.fill();
  var slope;
  if(mx>oldX){
    slope = (my-oldY)/(mx-oldX);
    for(var i = oldX;i<mx;i++){
      query[i] = cHeight-(((i-oldX)*slope)+oldY);
      //  query[i] = searchCanvas.height - my;
      //console.log("Set query["+i+"]");
    }
  }
  else if(mx<oldX){
    slope = (oldY-my)/(oldX-mx);
    for(var i = mx;i<oldX;i++){
      query[i] = cHeight-(((i-mx)*slope)+my);
    }
    //  console.log("Set query["+i+"]");
  }
  else{
    query[mx] = cHeight-my;
    //  console.log("Set query["+mx+"]");
  }
  
}

function eraseLine(mx,my){
  
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(oldX,0);
  context.lineTo(oldX,cHeight);
  context.lineTo(mx,cHeight);
  context.lineTo(mx,0);
  context.closePath();
  context.fill();
  
  context.fillStyle = "#ff0000";
  context.beginPath();
  context.moveTo(oldX,cHeight);
  context.lineTo(oldX,cHeight-nanHeight);
  context.lineTo(mx,cHeight-nanHeight);
  context.lineTo(mx,cHeight);
  context.closePath();
  context.fill();
  
  if(mx>oldX){
    for(var i = oldX;i<mx;i++){
      query[i] = -1;
    }
  }
  else if(mx<oldX){
    for(var i = mx;i<oldX;i++){
      query[i] = -1;
    }
  }
  else{
    query[mx] = -1;
  }
}




function mouseUp(m_event){
  drawing = false;
  //  resetCanvas();
  oldX = -1;
  oldY = -1;
}

function mouseLeave(m_event){
  drawing = false;
}
function resetQuery(){
  context.clearRect(0,0,searchCanvas.width,cHeight);
  for(var i = 0;i<query.length;i++){
    query[i] = -1;
  }
  sparseQuery = new Array();
  
  context.fillStyle = "#ff0000";
  context.beginPath();
  context.moveTo(0,cHeight);
  context.lineTo(0,cHeight-nanHeight);
  context.lineTo(searchCanvas.width,cHeight-nanHeight);
  context.lineTo(searchCanvas.width,cHeight);
  context.closePath();
  context.fill();
  
}


function updateColors(){
  d3.select("#multiples").selectAll("svg").select("path").each(function(d){
                                                               d3.select(this).attr("fill",hitColorScale(d.bestHit));
                                                               });}


//Drag and drop


function touchInit(e){
  lastTouched = new Date.getTime();
  //  alert("started");
}

function touchTransfer(e){
  //  alert("ended");
  if(lastTouched==-1){
    lastTouched = new Date().getTime();
  }
  else{
    var now = new Date().getTime();
    var delta = now-lastTouched;
    //  alert(delta);
    if(delta<500 && delta>0){
      e.preventDefault();
      transferQuery(e);
    }
    lastTouched = now;
  }
  //  alert("super ended");
}

function transferQuery(e){
  dragged = e.target;
  while(dragged.tagName!="svg")
  {
    dragged = dragged.parentNode;
  }
  dragged = d3.select(dragged);
  drawQuery(dragged.datum());
}

function drawQuery(symbol){
  resetQuery();
  var nextX;
  var curX;
  var curY;
  var nextY;
  var slope;
  for(var i = 0;i<symbol.values.length-1;i++){
    curX = Math.floor(rX(symbol.values[i][time]));
    nextX = Math.floor(rX(symbol.values[i+1][time]));
    curY = cHeight - rY(symbol.y(symbol.values[i][value]));
    nextY = cHeight- rY(symbol.y(symbol.values[i+1][value]));
    
    context.fillStyle = "#333";
    context.beginPath();
    context.moveTo(curX,cHeight);
    context.lineTo(curX,curY);
    context.lineTo(nextX,nextY);
    context.lineTo(nextX,cHeight);
    context.closePath();
    context.fill();
    
    context.fillStyle = "#fff";
    context.beginPath();
    context.moveTo(curX,0);
    context.lineTo(curX,curY);
    context.lineTo(nextX,nextY);
    context.lineTo(nextX,0);
    context.closePath();
    context.fill();
    
    slope = (nextY-curY)/(nextX-curX);
    for(var j = curX;j<nextX;j++){
      query[j] = cHeight - (curY + (slope*(j-curX)));
    }
  }
}

function setInvariants(){
  //MSE Does not afford: y position, amplitude, warp
  //Hough does not afford: unchecked y position, warp
  //DTW does not afford xposition, y position unchecked warp
  var currentMode = document.getElementById("queryMode").value;
  d3.selectAll("[type=checkbox]").each(function(){this.disabled="";});
  
  switch(currentMode){
      
    case "2":
      document.getElementById("XPos").checked=false;
      document.getElementById("XPos").disabled = "true";
      document.getElementById("YPos").checked=false;
      document.getElementById("YPos").disabled="true";
      document.getElementById("Warp").checked=true;
      document.getElementById("Warp").disabled="true";
      document.getElementById("Amp").checked=false;
      document.getElementById("Amp").disabled="true";
      break;
      
    case "1":
      document.getElementById("Warp").checked=false;
      document.getElementById("Warp").disabled = "true";
      document.getElementById("YPos").checked=true;
      document.getElementById("YPos").disabled= "true";
      break;
      
    case "0":
      document.getElementById("YPos").checked=false;
      document.getElementById("YPos").disabled="true";
      document.getElementById("Warp").checked=false;
      document.getElementById("Warp").disabled="true";
      document.getElementById("Amp").checked=false;
      document.getElementById("Amp").disabled="true";
    default:
      break;
  }
}

function lpf(series){
  //Series is a dense series. Return a denoised one.
  //Just do a weighted average rather than an actual sinc filter: no need to get too fancy
  var smoothFactor = Math.max(5,0.1 * series.length);
  var smoothed = Array(series.length);
  //need a deep copy, luckily we just need value, not date
  
  for(var i = 0;i<smoothed.length;i++){
    smoothed[i] = series[i][value];
  }
  
  var curAvg = series[0][value];
  for(var i = 1;i<smoothed.length;i++){
    curAvg += (series[i][value] - curAvg)/smoothFactor;
    smoothed[i] = curAvg;
  }
  return smoothed;
}

load();