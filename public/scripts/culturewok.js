var firstfile = true;
var lasttimelength = 0;

var map, playStep, fileindex;
var mytime = new Date();
var mintime = (new Date("January 1, 5000")) * 1;
var maxtime = (new Date("January 1, 100")) * 1;
var gaps = [ ];
var settime = null;
var maxlat = -90;
var minlat = 90;
var maxlng = -180;
var minlng = 180;
var timelayers = [ ];
var fixlayers = [ ];
var trimvals = [ ];
var oldlines = [ ];
var reader, fileindex, files;
var ingap = false;
var coeff = null;

$(document).ready(function(){
  // on tablet or mobile | replace drag-and-drop with upload button
  if( navigator.userAgent.match(/(iPod|iPhone|iPad)/i) || (navigator.userAgent.toLowerCase().indexOf("android") > -1) ){
    switchToMobile();
  }

  // make a Leaflet map
  map = new L.Map('map');
  map.attributionControl.setPrefix('');
  var terrain = 'http://{s}.tiles.mapbox.com/v3/mapmeld.map-ofpv1ci4/{z}/{x}/{y}.png';
  var terrainAttrib = 'Map data &copy; 2013 OpenStreetMap contributors, Tiles &copy; 2013 MapBox';
  //var terrain = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  //var terrainAttrib = 'Map data &copy; 2013 OpenStreetMap contributors';
  
  terrainLayer = new L.TileLayer(terrain, {maxZoom: 15, attribution: terrainAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(40.484037,-106.825046), 10);

  // set up the jQuery timeline slider
  $("#slidebar").slider({
    orientation: "horizontal",
    range: "min",
    min: 0, // (new Date()) - 24 * 60 * 60 * 1000,
    max: 100, // (new Date()) * 1,
    value: 0, // 500,
    slide: function(event, ui){
      if(playStep){
        window.clearInterval(playStep);
        playStep = null;
        $(".btn-inverse").css({ display: "none" });
        $(".btn-success").css({ display: "inline" });
      }
      settime = getTimelineTime(ui.value);
      displayTime(settime);
      geotimes(settime);
    }
  });
  
  if(myjson.length){
    firstfile = false;
    myjson = $.parseJSON(myjson);
    
    if(myjson.length){
      // load users' identifiable tracks
      files = [ ];
      for(var t=0;t<myjson.length;t++){
        $.getJSON("/track/" + myjson[t], function(data){
          if(data.xml != "fail"){
            processFile({ target: { result: data.xml } });
          }
        });
      }
    }
    else{
    
      var timed = myjson.timed;
      for(var t=0;t<timed.length;t++){
        if(typeof timed[t].times != 'undefined'){
          // moving point
          var movemarker = new L.marker(new L.LatLng(0,0), { clickable: false });
          var moveline = [ ];
          for(var c=0;c<timed[t].coords.length;c++){
            maxlat = Math.max(maxlat, timed[t].coords[c][0]);
            maxlng = Math.max(maxlng, timed[t].coords[c][1]);
            minlat = Math.min(minlat, timed[t].coords[c][0]);
            minlng = Math.min(minlng, timed[t].coords[c][1]);
            mintime = Math.min(mintime, timed[t].times[c]);
            maxtime = Math.max(maxtime, timed[t].times[c]);
            moveline.push(new L.LatLng( timed[t].coords[c][0], timed[t].coords[c][1] ));
            timelayers.push({
              geo: movemarker,
              ll: new L.LatLng( timed[t].coords[c][0], timed[t].coords[c][1] ),
              time: new Date( timed[t].times[c] )
            });
          }
          var oldline = new L.polyline(moveline, { color: "#000", weight: 1 });
          oldlines.push(oldline);
          map.addLayer(oldline);
        }
        else{
          // geo with start and/or end
          var timelyr = { };
          if(typeof timed[t].start != 'undefined'){
            mintime = Math.min(mintime, timed[t].start);
            maxtime = Math.max(maxtime, timed[t].start);
            timelyr.start = new Date( timed[t].start );
          }
          if(typeof timed[t].end != 'undefined'){
            mintime = Math.min(mintime, timed[t].end);
            maxtime = Math.max(maxtime, timed[t].end);
            timelyr.end = new Date( timed[t].end );
          }
          if(typeof timed[t].coords[0].length != 'undefined'){
            // Polygon
            for(var c=0;c<timed[t].coords.length;c++){
              maxlat = Math.max(maxlat, timed[t].coords[c][0]);
              maxlng = Math.max(maxlng, timed[t].coords[c][1]);
              minlat = Math.min(minlat, timed[t].coords[c][0]);
              minlng = Math.min(minlng, timed[t].coords[c][1]);
              timed[t].coords[c] = new L.LatLng(timed[t].coords[c][0], timed[t].coords[c][1]);
            }
            timelyr.geo = new L.polygon( timed[t].coords );
          }
          else{
            // Point
            maxlat = Math.max(maxlat, timed[t].coords[0]);
            maxlng = Math.max(maxlng, timed[t].coords[1]);
            minlat = Math.min(minlat, timed[t].coords[0]);
            minlng = Math.min(minlng, timed[t].coords[1]); 
            timelyr.geo = new L.marker( new L.LatLng( timed[t].coords[0], timed[t].coords[1] ) );
          }
          timelayers.push(timelyr);
        }
      }
      var fixed = myjson.fixed;
      if(fixed.geojson.length){
        // static GeoJSON
        L.geoJson( { "type": "FeatureCollection", "features": fixed.geojson } , { onEachFeature: jsonmap });
      }
      // static KML, currently unsupported
      //for(var t=0;t<fixed.kml.length;t++){
      //  // catch minlat, maxlat, minlng, maxlng, mintime, maxtime
      //}
      map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
      updateTimeline();
    }
  }
  
  // add play and pause buttons
  playStep = null;
  
  $(".btn-success").on("click", function(){
    $(".btn-success").css({ display: "none" });
    $(".btn-inverse").css({ display: "inline" });
    
    if(!playStep){
      if(!settime){
        settime = mintime;
      }
      playStep = setInterval(function(){
        if(!ingap){
          var movetime = maxtime - mintime;
          for(var g=0;g<gaps.length;g++){
            movetime -= (gaps[g].end - gaps[g].start);
          }
          settime = Math.min(maxtime, settime + movetime / 500 );
          if(settime == maxtime){
            // end of the timeline
            $(".btn-inverse").css({ display: "none" });
            $(".btn-success").css({ display: "inline" });
            clearInterval(playStep);
            playStep = null;
          }
          setTimeline(settime);
          displayTime(settime);
          geotimes(settime);
        }
      }, 50);
    }
  });
  $(".btn-inverse").on("click", function(){
    $(".btn-inverse").css({ display: "none" });
    $(".btn-success").css({ display: "inline" });

    if(playStep){
      clearInterval(playStep);
      playStep = null;
    }
  });
});

function getTimelineTime(val){
  if(!gaps.length){
    return mintime + (maxtime - mintime) * val / 100;
  }
  else{
    var movetime = maxtime - mintime;
    for(var g=0;g<gaps.length;g++){
      movetime -= (gaps[g].end - gaps[g].start);
    }
    var mymin = mintime * 1;
    for(var g=0;g<gaps.length;g++){
      if(val > (gaps[g].start - mymin) / movetime * 100){
        // gap has come and gone
        mymin += (gaps[g].end - gaps[g].start);
      }
      else{
        break;
      }
    }
    return (mymin * 1 + val / 100 * movetime);
  }
}

function setTimeline(t){
  var val = null;
  var timetotal = t;
  if(!gaps.length){
    val = (t - mintime) / (maxtime - mintime) * 100;
  }
  else{
    var movetime = maxtime - mintime;
    for(var g=0;g<gaps.length;g++){
      movetime -= (gaps[g].end - gaps[g].start);
    }
    for(var g=0;g<gaps.length;g++){
      if((t > gaps[g].start) && (t < gaps[g].end)){
        // inside a gap
        if(!ingap){
          ingap = true;
          $(".clock").css({ display: "inline" });
          setTimeout(function(){
            if(ingap){
              settime = gaps[g].end * 1 + 1000;
              setTimeline(gaps[g].end * 1 + 1000);
              ingap = false;
              $(".clock").css({ display: "none" });
            }
          }, 500);
        }
        break;
      }
      else if(t < gaps[g].start){
        // before this gap
        break;
      }
      else{
        timetotal -= (gaps[g].end - gaps[g].start);
      }
    }
    val = (timetotal - mintime) / movetime * 100;
  }
  $("#slidebar").slider({ value: Math.min(100, val) });
}

function updateTimeline(){
  if(maxtime > mintime && !firstfile){
    $(".instructions").css({ display: "none" });
    $(".output").css({ display: "block" });
  }

  gaps = [ ];
  var alltimes = timelayers.concat().sort(function(a,b){
    return a.time - b.time;
  });
  for(var t=0;t<alltimes.length-1;t++){
    if((alltimes[t+1].time - alltimes[t].time > 0.1 * (maxtime - mintime)) || ( alltimes[t+1].time - alltimes[t].time > 60 * 60 * 1000 )){
      gaps.push({
        start: alltimes[t].time * 1 + 1000,
        end: alltimes[t+1].time * 1 - 1000
      });
    }
  }
  
  $("#slidebar").slider({
    min: 0, //mintime,
    max: 100, //maxtime,
    value: 0 //mintime
  });
  displayTime(mintime);
  geotimes(mintime);
}

function geotimes(nowtime){
  var coordTime = null;
  var lastCoord = null;
  for(var t=0;t<timelayers.length;t++){
    if(typeof timelayers[t].ll != 'undefined'){
      // moving coordinate-time marker
      if(!coordTime || coordTime != timelayers[t].geo){
        // on the first coordinate-time pair read for a marker:

        if( coordTime && lastCoord ){
          // there was a marker before this marker, but it never read a time after the timeline
          // currently we drop these markers
          map.removeLayer( coordTime );
        }
        
        coordTime = timelayers[t].geo;
        if( nowtime < timelayers[t].time * 1 ){
          // first coordinate-time pair has not yet occurred. Drop this marker.
          map.removeLayer( timelayers[t].geo );
          lastCoord = null;
          continue;
        }
        // continue reading coordinates from this marker
        lastCoord = timelayers[t].ll;
      }
      else if( lastCoord && nowtime > timelayers[t].time * 1 ){
        // continue reading coordinates from this marker
        lastCoord = timelayers[t].ll;
      }
      else if( lastCoord ){
        // reached a coordinate past the end time
        // map last coordinate
        timelayers[t].geo.setLatLng( lastCoord );
        if(!map.hasLayer( timelayers[t].geo )){
          map.addLayer( timelayers[t].geo );
        }
        lastCoord = null;
      }
    }
    else{
      // fixed items with a start, an end, or both
      if(typeof timelayers[t].start != 'undefined'){
        if(timelayers[t].start * 1 > nowtime){
          // geo hasn't started
          map.removeLayer(timelayers[t].geo);
        }
        else if(typeof timelayers[t].end == 'undefined'){
          // geo has started, has no end
          if(!map.hasLayer(timelayers[t].geo)){
            map.addLayer(timelayers[t].geo);
          }
        }
        else if(timelayers[t].end * 1 > nowtime){
          // geo has started, not yet ended
          if(!map.hasLayer(timelayers[t].geo)){
            map.addLayer(timelayers[t].geo);
          }
        }
        else{
          // geo has ended
          map.removeLayer(timelayers[t].geo);
        }
      }
      else{
        // start wasn't defined, but end must be
        if(timelayers[t].end * 1 > nowtime){
          // geo has not yet ended
          if(!map.hasLayer(timelayers[t].geo)){
            map.addLayer(timelayers[t].geo);
          }
        }
        else{
          map.removeLayer(timelayers[t].geo);        
        }
      }
    }
  }
  if( coordTime && lastCoord ){
    // last marker never read a time after the timeline
    map.removeLayer( coordTime );
  }
}

function jsonmap(feature, layer){
  var timefeature = { geo: layer };
  
  // read map boundaries
  if(feature.geometry.type == "Polygon"){
    var pts = feature.geometry.coordinates[0];
    for(var p=0;p<pts.length;p++){
      minlat = Math.min(minlat, pts[p][1]);
      maxlat = Math.max(maxlat, pts[p][1]);
      minlng = Math.min(minlng, pts[p][0]);
      maxlng = Math.max(maxlng, pts[p][0]);
    }
  }
  else if(typeof feature.geometry.coordinates[0] == "number"){
    // GeoJSON point
    var pt = feature.geometry.coordinates;
    minlat = Math.min(minlat, pt[1]);
    maxlat = Math.max(maxlat, pt[1]);
    minlng = Math.min(minlng, pt[0]);
    maxlng = Math.max(maxlng, pt[0]);
  }
  
  // read any start and end times
  if(typeof feature.properties.start != 'undefined'){
    if(isNaN(feature.properties.start * 1)){
      timefeature.start = new Date(feature.properties.start);
    }
    else if(feature.properties.start * 1 >= 100 && feature.properties.start * 1 <= 5000){
      timefeature.start = new Date("January 10, " + feature.properties.start);
    }
    else{
      timefeature.start = new Date(1 * feature.properties.start);
    }
    mintime = Math.min( mintime, timefeature.start * 1 );
    maxtime = Math.max( maxtime, timefeature.start * 1 );
  }
  if(typeof feature.properties.end != 'undefined'){
    if(isNaN(feature.properties.end * 1)){
      timefeature.end = new Date(feature.properties.end);
    }
    else if(feature.properties.end * 1 >= 100 && feature.properties.end * 1 <= 5000){
      timefeature.end = new Date("January 10, " + feature.properties.end);
    }
    else{
      timefeature.end = new Date(1 * feature.properties.end);
    }
    mintime = Math.min( mintime, timefeature.end * 1 );
    maxtime = Math.max( maxtime, timefeature.end * 1 );
  }
            
  if(typeof timefeature.start == 'undefined' && typeof timefeature.end == 'undefined'){
    // no start or end, so just add it to the map
    if(typeof layer.setStyle == 'function'){
      layer.setStyle({ clickable: false });
    }
    fixlayers.push({ properties: feature.properties, geometry: feature.geometry, type: feature.type });
    map.addLayer(layer);
  }
  else{
    // save this timefeature
    timelayers.push(timefeature);
  }
}

function kmlmap(placemark){
  var geos = [];
  if(placemark.getElementsByTagName("Point").length){
    // KML Points
    var pts = placemark.getElementsByTagName("Point");
    for(var i=0;i<pts.length;i++){
      var pt = pts[i];
      var coords = $(pts[i].getElementsByTagName("coordinates")[0]).text().split(',');
      geos.push( new L.marker( new L.LatLng( coords[1], coords[0] ), { clickable: false } ) );
      
      minlat = Math.min( minlat, coords[1] );
      maxlat = Math.max( maxlat, coords[1] );
      minlng = Math.min( minlng, coords[0] );
      maxlng = Math.max( maxlng, coords[0] );
    }
  }
  if(placemark.getElementsByTagName("Polygon").length){
    // KML Polygons
    var polys = placemark.getElementsByTagName("Polygon");
    for(var i=0;i<polys.length;i++){
      var poly = polys[i];
      var coords;
      if(poly.getElementsByTagName("outerBoundaryIs").length){
        coords = poly.getElementsByTagName("outerBoundaryIs")[0].getElementsByTagName("coordinates")[0];
      }
      else{
        coords = poly.getElementsByTagName("coordinates")[0];
      }
      coords = $(coords).text().split(' ');
      for(var pt=0;pt<coords.length;pt++){
        coords[pt] = coords[pt].split(',');
        coords[pt] = new L.LatLng( coords[pt][1], coords[pt][0] );

        minlat = Math.min( minlat, coords[pt].lat );
        maxlat = Math.max( maxlat, coords[pt].lat );
        minlng = Math.min( minlng, coords[pt].lng );
        maxlng = Math.max( maxlng, coords[pt].lng );
      }
      geos.push( new L.polygon( coords, { clickable: false } ) );
    }
  }
  return geos;
}

function switchToMobile(){
  $(".desktop").css({ display: "none" });
  $(".mobile").css({ display: "block" });
}

function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}