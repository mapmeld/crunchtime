var map;

$(document).ready(function(){
  // make a Leaflet map
  map = new L.Map('map', { zoomControl: false, panControl: false });
  map.attributionControl.setPrefix('');
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);
  //var toner = 'http://localhost:20008/tile/MarshallIslands/{z}/{x}/{y}.png?updated=1356689237000';
  var toner = 'http://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy; 2013 OpenStreetMap contributors, Tiles by Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 15, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(40.484037,-106.825046), 13);
});
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}