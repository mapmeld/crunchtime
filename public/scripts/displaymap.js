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

  // set up the file drop
  document.body.addEventListener('dragenter', blockHandler, false);
  document.body.addEventListener('dragexit', blockHandler, false);
  document.body.addEventListener('dragover', blockHandler, false);
  document.body.addEventListener('drop', dropFile, false);

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
  else{
    // load default GeoJSON from Chicago
    $.getJSON('/geos/chicago.geojson', function(gj){
      L.geoJson(gj, { onEachFeature: jsonmap });
      map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
      updateTimeline();
    });
  }
  
  // add play button timer
  playStep = null;
  $(".btn-success").on("click", function(){
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
          setTimeline(settime);
          displayTime(settime);
          geotimes(settime);
        }
      }, 50);
    }
  });

  // trim the gpx
  $("#edittime").on("click", function(){
    if(mintime * 1 < maxtime * 1){
      $("#trimstart").text( (new Date(mintime)).toUTCString() );
      $("#trimend").text( (new Date(maxtime)).toUTCString() );
      //$("#trimslider").html("");
      $("#trimslider").slider({
        range: true,
        min: mintime,
        max: maxtime,
        values: [ mintime, maxtime ],
        slide: function(event, ui) {
          ingap = false;
          $(".clock").css({ display: "none" });
          trimvals = ui.values;
          $("#trimstart").text( (new Date( ui.values[0] )).toUTCString() );
          $("#trimend").text( (new Date( ui.values[1] )).toUTCString() );
        }
      });

      $("#timelinetrim").modal('show');
    }
  });
  $("#trimnow").on("click", function(){
    mintime = trimvals[0];
    maxtime = trimvals[1];
    trimGPS();
    updateTimeline();
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

  files = e.dataTransfer.files;
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

    reader = new FileReader();
    reader.onload = processFile;
    fileindex = 0;
    reader.readAsText(files[0]);
  }
};

function processFile(e){
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
                          if(isNaN(rawline[timecol]) * 1){
                            mytime = new Date( rawline[timecol] );
                          }
                          else{
                            mytime = new Date( rawline[timecol] * 1 );                              
                          }
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

                        var mytime;
                        if(isNaN(rawline[timecol]) * 1){
                          mytime = new Date( rawline[timecol] );
                        }
                        else{
                          mytime = new Date( rawline[timecol] * 1 );                              
                        }
                        mintime = Math.min( mintime, mytime * 1 );
                        maxtime = Math.max( maxtime, mytime * 1 );

                        timelayers.push({
                          geo: movemarker,
                          ll: mycoord,
                          time: mytime
                        });
                      }
                    }
                    var oldline = new L.polyline(moveline, { color: "#000", weight: 1 });
                    oldlines.push(oldline);
                    map.addLayer(oldline);
                    $(".modal").modal('hide');

                    updateTimeline();
                    fileindex++;
                    if(fileindex < files.length){
                      return reader.readAsText(files[fileindex]);
                    }
                    else{
                      map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
                      return savemap();
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
            return reader.readAsText(files[fileindex]);
          }
          else{
            map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
            return savemap();
          }
        });
        // process continues after using modal to process or cancel CSV
        return;
      }
      else{
        // not a valid CSV... continue to next file
        fileindex++;
        if(fileindex < files.length){
          return reader.readAsText(files[fileindex]);
        }
        else{
          map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
          return savemap();
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
      var oldline = new L.polyline(moveline, { color: "#000", weight: 1 });
      oldlines.push(oldline);
      map.addLayer(oldline);
      updateTimeline();
      fileindex++;
      if(fileindex < files.length){
        return reader.readAsText(files[fileindex]);
      }
      else{
        map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
        savemap();
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
        var oldline = new L.polyline(moveline, { color: "#000", weight: 1 });
        oldlines.push(oldline);
        map.addLayer(oldline);
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
      var oldline = new L.polyline(oldmoveline, { clickable: false });
      oldlines.push(oldline);
      map.addLayer(oldline);
    }
    updateTimeline();
    fileindex++;
    if(fileindex < files.length){
      return reader.readAsText(files[fileindex]);
    }
    else{
      map.fitBounds(new L.LatLngBounds(new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng)));
      savemap();
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
    savemap();
  }
}

function savemap(){
  files = [ ];

  if(!timelayers.length || lasttimelength == timelayers.length + fixlayers.length){
    // if there is no geotime data or additional points, the map doesn't save
    return;
  }
  lasttimelength = timelayers.length + fixlayers.length;

  var saver = {
    timed: [ ],
    fixed: {
      kml: [ ],
      geojson: [ ]
    }
  };
  var movemarker = null;
  for(var t=0;t<timelayers.length;t++){
    if(typeof timelayers[t].ll != 'undefined'){
      // Moving Point
      if(movemarker && movemarker == timelayers[t].geo){
        // continue an existing Moving Point
        saver.timed[ saver.timed.length-1 ].coords.push( [ timelayers[t].ll.lat, timelayers[t].ll.lng ] );
        saver.timed[ saver.timed.length-1 ].times.push( timelayers[t].time * 1 );
      }
      else{
        // init a Moving Point
        movemarker = timelayers[t].geo;
        saver.timed.push({
          coords: [
            [ timelayers[t].ll.lat, timelayers[t].ll.lng ]
          ],
          times: [ timelayers[t].time * 1 ]
        });
      }
    }
    else{
      // feature with start and/or end
      var starter = { coords: [ ] };
      if(typeof timelayers[t].start != 'undefined'){
        starter.start = timelayers[t].start * 1;
      }
      if(typeof timelayers[t].end != 'undefined'){
        starter.end = timelayers[t].end * 1;
      }
      
      if(typeof timelayers[t].geo.getLatLngs == 'function'){
        // Polygon
        var mypts = timelayers[t].geo.getLatLngs();
        for(var pt=0;pt<mypts.length;pt++){
          starter.coords.push([ mypts[pt].lat, mypts[pt].lng ]);
        }
      }
      else{
        // Point
        starter.coords = [ timelayers[t].geo.getLatLng().lat, timelayers[t].geo.getLatLng().lng ];
      }
      saver.timed.push(starter);
    }
  }
  for(var t=0;t<fixlayers.length;t++){
    if(typeof fixlayers[t].length != 'undefined'){
      // static KML from layers, currently unsupported
      //saver.fixed.kml.push();
    }
    else{
      // static GeoJSON
      saver.fixed.geojson.push( fixlayers[t] );
    }
  }
  $.post('/map', { json: JSON.stringify(saver) }, function(data){
    history.pushState(null, null, '/map/' + data.outcome);
  });
}

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

function trimGPS(){
  // remove or move up GPS times
  
  // remove any old GPS track lines
  for(var i=0;i<oldlines.length;i++){
    map.removeLayer( oldlines[i] );
  }
  oldlines = [ ];

  // reset min/max lat/lng
  maxlat = -90;
  minlat = 90;
  maxlng = -180;
  minlng = 180;

  var moveobj = { line: [ ], geo: null };

  for(var i=timelayers.length-1;i>=0;i--){
    if(typeof timelayers[i].ll != 'undefined'){
      // remove missing times
      if((mintime > timelayers[i].time * 1)||(maxtime < timelayers[i].time * 1)){
        timelayers.splice(i, 1);
        continue;
      }
      // draw moveline
      if(timelayers[i].geo == moveobj.geo){
        // add point to moveline
        moveobj.line.push( timelayers[i].ll );
      }
      else{
        // map last line
        var oldline = new L.polyline(moveobj.line, { color: "#000", weight: 1 });
        map.addLayer(oldline);
        oldlines.push(oldline);
        
        // start this new line
        moveobj = { line: [ timelayers[i].ll ], geo: timelayers[i].geo };
      }
      
      // include valid times on map
      maxlat = Math.max(maxlat, timelayers[i].ll.lat);
      minlat = Math.min(minlat, timelayers[i].ll.lat);
      maxlng = Math.max(maxlng, timelayers[i].ll.lng);
      minlng = Math.min(minlng, timelayers[i].ll.lng);
    }
    else{
      // remove and adjust missing times
      if(typeof timelayers[i].start != "undefined"){
        if(maxtime < timelayers[i].start * 1){
          timelayers.splice(i, 1);
          continue;
        }
        else if(mintime > timelayers[i].start * 1){
          timelayers[i].start = new Date(mintime);
        }
      }
      if(typeof timelayers[i].end != "undefined"){
        if(mintime > timelayers[i].end * 1){
          timelayers.splice(i, 1);
          continue;
        }
        else if(maxtime < timelayers[i].end * 1){
          timelayers[i].end = new Date(maxtime);
        }
      }

      // include valid times on map
      var bounds = timelayers[i].geo.getBounds();
      maxlat = Math.max(maxlat, bounds.getNorthEast().lat);
      minlat = Math.min(minlat, bounds.getSouthWest().lat);
      maxlng = Math.max(maxlng, bounds.getNorthEast().lng);
      minlng = Math.min(minlng, bounds.getSouthWest().lng);
    }
  }
  // map last line, if it exists
  if(moveobj.geo){
    var oldline = new L.polyline(moveobj.line, { color: "#000", weight: 1 });
    map.addLayer(oldline);
    oldlines.push(oldline);
  }
  // move to new min/max lat/lng
  map.fitBounds( new L.LatLngBounds( new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng) ) );

  $(".modal").modal('hide');
  
  savemap();
}

function simplifyLines(simplifyCoeff){
  if(!timelayers.length){
    return;
  }

  // remove any old GPS track lines
  for(var i=0;i<oldlines.length;i++){
    map.removeLayer( oldlines[i] );
  }
  oldlines = [ ];
  
  var currentMarker = timelayers[timelayers.length-1].geo;
  var currentPts = [ ];
  for(var t=timelayers.length-1;t>=0;t--){
    if(timelayers[t].geo != currentMarker || t == 0){
      if(currentPts.length >= 2){
        // simplify this line
        var repMarker = new L.Marker();
        var leafPts = simplify(currentPts, simplifyCoeff);
        for(var p=0;p<leafPts.length;p++){
          leafPts[p] = new L.LatLng( leafPts[p].y * 1.0, leafPts[p].x * 1.0 );
          timelayers.push({
            geo: repMarker,
            ll: leafPts[p],
            time: new Date( leafPts[p].z * 1 )
          });
        }
        
        var oldline = new L.polyline( leafPts, { weight: 1, color: "#000" });
        oldlines.push(oldline);
        map.addLayer(oldline);
        
        // edit out the old timelayer
        for(var x=timelayers[t].length-1;x>=t;x--){
          if(timelayers[t].geo == timelayers[x].geo){
            timelayers.splice(x,1);
          }
        }
      }

      // set up for next geo
      currentMarker = timelayers[t].geo;
      if(typeof timelayers[t].time != "undefined"){
        currentPts = [{
          x: timelayers[t].ll.lng,
          y: timelayers[t].ll.lat,
          z: timelayers[t].time * 1
        }];
      }
    }
    else if(typeof timelayers[t].time != "undefined"){
      currentPts.push({
        x: timelayers[t].ll.lng,
        y: timelayers[t].ll.lat,
        z: timelayers[t].time * 1
      });
    }
  }
  trimGPS();
  updateTimeline();
}

function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}