var firstfile = true;
var lasttimelength = 0;

var map, playStep, fileindex, setMyButton;
var mytime = new Date();
var mintime = (new Date("January 1, 5000")) * 1;
var maxtime = (new Date("January 1, 100")) * 1;
var maxlat = -90;
var minlat = 90;
var maxlng = -180;
var minlng = 180;
var settime = null;
var timelayers = [ ];
var fixlayers = [ ];

$(document).ready(function(){
  // make a Leaflet map
  map = new L.Map('map');
  map.attributionControl.setPrefix('');
  var terrain = 'http://localhost:20008/tile/MarshallIslands/{z}/{x}/{y}.png?updated=1361025813000';
//  var terrain = 'http://{s}.tiles.mapbox.com/v3/mapmeld.map-ofpv1ci4/{z}/{x}/{y}.png';
  var terrainAttrib = 'Map data &copy; 2013 OpenStreetMap contributors, Tiles &copy; 2013 MapBox';
  terrainLayer = new L.TileLayer(terrain, {maxZoom: 15, attribution: terrainAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(40.484037,-106.825046), 10);

  // set up the file drop
  document.body.addEventListener('dragenter', blockHandler, false);
  document.body.addEventListener('dragexit', blockHandler, false);
  document.body.addEventListener('dragover', blockHandler, false);
  document.body.addEventListener('drop', dropFile, false);

  // set up the jQuery timeline slider
  $("#slidebar").slider({
    orientation: "horizontal",
    range: "min",
    min: (new Date()) - 24 * 60 * 60 * 1000,
    max: (new Date()) * 1,
    value: 500,
    slide: function(event, ui){
      if(playStep){
        window.clearInterval(playStep);
        playStep = null;
      }
      settime = ui.value;
      displayTime(ui.value);
      //console.log('slider');
      geotimes(ui.value);
    }
  });
  
  // load default GeoJSON from Chicago
  $.getJSON('chicago.geojson', function(gj){
    L.geoJson(gj, { onEachFeature: jsonmap });
    map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
    updateTimeline();
  });

  // add play button timer
  playStep = null;
  $(".btn-success").on("click", function(){
    if(!playStep){
      if(!settime){
        settime = mintime;
      }
      playStep = setInterval(function(){
        settime = Math.min(maxtime, settime + (maxtime - mintime) / 500 );
        $("#slidebar").slider({ value: settime });
        displayTime(settime);
        geotimes(settime);
      }, 50);
    }
  });
});

var displayTime = function(t){
  $("#readtime").text( (new Date(t)).toUTCString() );
};

var blockHandler = function(e){
  e.stopPropagation();
  e.preventDefault();
};

var dropFile = function(e){
  e.stopPropagation();
  e.preventDefault();

  var files = e.dataTransfer.files;
  if(files && files.length){
    if(firstfile){
      // remove default map
      for(var t=0;t<timelayers.length;t++){
        map.removeLayer(timelayers[t].geo);
      }
      timelayers = [ ];

      // reset defaults
      mintime = (new Date("January 1, 5000")) * 1;
      maxtime = (new Date("January 1, 100")) * 1;
      maxlat = -90;
      minlat = 90;
      maxlng = -180;
      minlng = 180;
    }
    firstfile = false;

    var reader = new FileReader();
    reader.onload = function(e){
      var injson;
      try{
        injson = $.parseJSON( e.target.result );
      }
      catch(err){
        // XML-based (KML, GPX)
        var xmlf;
        try{
          xmlf = $.parseXML( e.target.result );
        }
        catch(err){
          // neither JSON or XML-based; go for CSV
          var lines = e.target.result.split('\n');
          if(lines.length == 1){
            lines = lines[0].split('\r');
          }
          var lineswithlength = [0, 0];
          var latcol = 0, lngcol = 1, timecol = 2;

          for(var i=0;i<lines.length;i++){
            var rawline = replaceAll(lines[i],'"','').split(',');
            // skip lines without any length
            if(rawline.length < 3){
              continue;
            }
            // wait to find three lines with the same length
            if(lineswithlength[0] == 0){
              lineswithlength = [1, rawline.length];
              continue;
            }
            else if(lineswithlength[0] < 3){
              if(rawline.length == lineswithlength[1]){
                // another line agrees that this is the standard length
                lineswithlength[0]++;
                if(lineswithlength[0] >= 3){
                  // standard length has just been found; restart count
                  i = -1;
                  // add buttons and prompt for column-naming
                  $("#colnamer").text("latitude");
                  setMyButton = function(col){
                    latcol = col;
                    $("#colbtn" + col).addClass("btn-success").html('&check;');
                    $("#colnamer").text("longitude");
                    setMyButton = function(col){
                      lngcol = col;
                      $("#colbtn" + col).addClass("btn-success").html('&check;');
                      $("#colnamer").text("time");
                      setMyButton = function(col){
                        timecol = col;
                        $("#colbtn" + col).addClass("btn-success").html('&check;');

                        var movemarker = new L.marker( new L.LatLng(0, 0), { clickable: false } );
                        var moveline = [ ];

                        for(var i=0;i<lines.length;i++){
                          var rawline = replaceAll(lines[i],'"','').split(',');
                          if(rawline.length == lineswithlength[1]){
                            // valid length line
                  
                            // avoid labels rows, where lat / lng / time cannot be decoded
                            if(isNaN(rawline[latcol] * 1) || isNaN(rawline[lngcol] * 1)){
                              continue;
                            }
                            var mytime = new Date();
                            try{
                              mytime = new Date( rawline[timecol] );
                            }
                            catch(e){
                              mytime = null;
                            }
                            if(mytime === null){
                              continue;
                            }

                            var mycoord = new L.LatLng( rawline[latcol] * 1.0, rawline[lngcol] * 1.0 );
                            moveline.push(mycoord);
                            maxlat = Math.max(maxlat, mycoord.lat);
                            maxlng = Math.max(maxlng, mycoord.lng);
                            minlat = Math.min(minlat, mycoord.lat);
                            minlng = Math.min(minlng, mycoord.lng);              

                            var mytime = new Date( rawline[timecol] );
                            mintime = Math.min( mintime, mytime * 1 );
                            maxtime = Math.max( maxtime, mytime * 1 );

                            timelayers.push({
                              geo: movemarker,
                              ll: mycoord,
                              time: mytime
                            });
                          }
                        }
                        map.addLayer(new L.polyline(moveline, { color: "#000", weight: 1 }));
                        $(".modal").modal('hide');
                        
                        updateTimeline();
                        fileindex++;
                        if(fileindex < files.length){
                          reader.readAsText(files[fileindex]);
                        }
                        else{
                         map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
                        }
                      };
                    };
                  };
                  var colButtons = "";
                  for(var c=0;c<lineswithlength[1];c++){
                    colButtons += "<td><a id='colbtn" + c + "' class='btn' href='#' onclick='setMyButton(" + c + ")'>X</a></td>";
                  }
                  $("#csvguide table").html("<tr>" + colButtons + "</tr>");
                }
                continue;
              }
              else{
                // a line with a different length, resets lineswithlength
                lineswithlength = [1, rawline.length];
                continue;
              }
            }
            else if(rawline.length != lineswithlength[1]){
              // length of standard lines is known; this one does not match
              continue;
            }

            // only lines with confirmed proper length reach this point
            var cols = "";
            for(var c=0;c<rawline.length;c++){
              cols += "<td>" + replaceAll( replaceAll( rawline[c], "<", "&lt;" ), ">", "&gt;") + "</td>";
            }
            
            $("#csvguide table").append('<tr>' + cols + '</tr>');
          }

          if(lineswithlength[0] >= 3 && lineswithlength[1] >= 3){
            $("#csvguide").modal('show');
            $(".cancelcsv").click(function(e){
              // user canceled this CSV... move on to next files
              fileindex++;
              if(fileindex < files.length){
                reader.readAsText(files[fileindex]);
              }
              else{
                map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
              }
            });
            // process continues after using modal to process CSV
            return;
          }
          else{
            // not a valid CSV... continue to next file
            fileindex++;
            if(fileindex < files.length){
              return reader.readAsText(files[fileindex]);
            }
            else{
              return map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
            }
          }
        }
        var placemarks = xmlf.getElementsByTagName("Placemark");
        if(!placemarks.length){
          // no KML Placemarks, go to GPX reader
          var pts = xmlf.getElementsByTagName("trkpt");
          var times = xmlf.getElementsByTagName("time");
          var moveline = [ ];
          if(pts.length && times.length && pts.length == times.length){
            var movemarker = new L.marker( new L.LatLng(0, 0), { clickable: false } );
            for(var p=0;p<pts.length;p++){
              var mycoord = new L.LatLng( 1.0 * pts[p].getAttribute("lat"), 1.0 * pts[p].getAttribute("lon") );
              moveline.push(mycoord);
              maxlat = Math.max(maxlat, mycoord.lat);
              maxlng = Math.max(maxlng, mycoord.lng);
              minlat = Math.min(minlat, mycoord.lat);
              minlng = Math.min(minlng, mycoord.lng);              

              var mytime = new Date( $(times[p]).text() );
              mintime = Math.min( mintime, mytime * 1 );
              maxtime = Math.max( maxtime, mytime * 1 );
              
              timelayers.push({
                geo: movemarker,
                ll: mycoord,
                time: mytime
              });
            }
          }
          map.addLayer(new L.polyline(moveline, { color: "#000", weight: 1 }));
          updateTimeline();
          fileindex++;
          if(fileindex < files.length){
            return reader.readAsText(files[fileindex]);
          }
          else{
            map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
            return;
          }
        }
        // KML loading
        var oldmarker = new L.marker(new L.LatLng(0,0), { clickable: false });
        var oldmoveline = [ ];
        for(var i=0;i<placemarks.length;i++){
          var inkml = placemarks[i];
          var whens = inkml.getElementsByTagName("when");
          var coords = inkml.getElementsByTagName("coord");
          if(whens.length && !coords.length){
            coords = inkml.getElementsByTagName("gx:coord");
            if(!coords.length){
              // old-style <Placemark><TimeSpan><when> syntax
              coords = inkml.getElementsByTagName("coordinates");
              var rawcoord = $(coords[0]).text().split(",");
              var mycoord = new L.LatLng( rawcoord[1] * 1.0, rawcoord[0] * 1.0 );
              oldmoveline.push(mycoord);
              maxlat = Math.max(maxlat, mycoord.lat);
              maxlng = Math.max(maxlng, mycoord.lng);
              minlat = Math.min(minlat, mycoord.lat);
              minlng = Math.min(minlng, mycoord.lng);              

              var mytime = new Date( $(whens[0]).text() );
              mintime = Math.min( mintime, mytime * 1 );
              maxtime = Math.max( maxtime, mytime * 1 );
              
              timelayers.push({
                geo: oldmarker,
                ll: mycoord,
                time: mytime
              });
              continue;
            }
          }
          var moveline = [ ];
          if(whens.length && coords.length && whens.length == coords.length){
            var movemarker = new L.marker( new L.LatLng(0, 0), { clickable: false } );
            for(var c=0;c<coords.length;c++){
              var rawcoord = $(coords[c]).text().split(" ");
              var mycoord = new L.LatLng( rawcoord[1] * 1.0, rawcoord[0] * 1.0 );
              moveline.push(mycoord);
              maxlat = Math.max(maxlat, mycoord.lat);
              maxlng = Math.max(maxlng, mycoord.lng);
              minlat = Math.min(minlat, mycoord.lat);
              minlng = Math.min(minlng, mycoord.lng);              

              var mytime = new Date( $(whens[c]).text() );
              mintime = Math.min( mintime, mytime * 1 );
              maxtime = Math.max( maxtime, mytime * 1 );
              
              timelayers.push({
                geo: movemarker,
                ll: mycoord,
                time: mytime
              });
            }
            map.addLayer(new L.polyline(moveline, { color: "#000", weight: 1 }));
          }
          else{
            // check for <begin> and <end> tags
            var begin = inkml.getElementsByTagName("begin");
            var end = inkml.getElementsByTagName("end");
            if(begin.length || end.length){
              // KML placemark with a begin and/or end
              var timefeature = { };
              if(begin.length){
                timefeature.start = new Date( $(begin[0]).text() );
                mintime = Math.min(mintime, timefeature.start * 1);
                maxtime = Math.max(maxtime, timefeature.start * 1);
              }
              if(end.length){
                timefeature.end = new Date( $(end[0]).text() );
                mintime = Math.min(mintime, timefeature.end * 1);
                maxtime = Math.max(maxtime, timefeature.end * 1);
              }
              timefeature.geo = kmlmap(inkml);
              timelayers.push( timefeature );
            }
            else{
              // KML object without a time
              var maps = kmlmap(inkml);
              for(var m=0;m<maps.length;m++){
                map.addLayer( maps[m] );
                fixlayers.push( maps );
              }
            }
          }
        }
        if(oldmoveline.length){
          map.addLayer(new L.polyline(oldmoveline, { clickable: false }));
        }
        updateTimeline();
        fileindex++;
        if(fileindex < files.length){
          return reader.readAsText(files[fileindex]);
        }
        else{
          map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
          return;
        }
      }
      L.geoJson(injson, {
        onEachFeature: jsonmap
      });
      updateTimeline();
        
      fileindex++;
      if(fileindex < files.length){
        reader.readAsText(files[fileindex]);
      }
      else{
        map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
      }
    };
    fileindex = 0;
    reader.readAsText(files[0]);
  }
};

function updateTimeline(){
  if(maxtime > mintime && !firstfile){
    $(".instructions").css({ display: "none" });
    $(".output").css({ display: "block" });
  }
  $("#slidebar").slider({
    min: mintime,
    max: maxtime,
    value: mintime
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
        //console.log('first pair');
        if( coordTime && lastCoord ){
          // there was a marker before this marker, but it never read a time after the timeline
          // currently we drop these markers
          //console.log('marker dropped');
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
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}