# Crunchtime

[![Greenkeeper badge](https://badges.greenkeeper.io/mapmeld/crunchtime.svg)](https://greenkeeper.io/)

Experimental timeline-map setup. Drop time-enabled map files onto the page. Accepts multiple files, multiple formats, and combining multiple formats.

### The Basic Idea

<img src="https://raw.github.com/mapmeld/crunchtime/master/howcrunchtimeworks.png"/>

### Trim and Simplify GPS Traces

<img src="https://raw.github.com/mapmeld/crunchtime/master/trimtime.png"/>
<br/>
<img src="https://raw.github.com/mapmeld/crunchtime/master/simplifyjs.png"/>

### Import Traces from OpenStreetMap

<img src="https://raw.github.com/mapmeld/crunchtime/master/osmlogin.png"/>

## Currently supports:

* GPX files

* KMLs using &lt;coord&gt; and &lt;when&gt; tags

* KMLs using &lt;begin&gt; and &lt;end&gt; tags

* Any CSV with valid latitude, longitude, and time readable by JavaScript Date( TIME * 1 ) or Date( TIME )

* GeoJSON with a start and/or end property. Assumes 100-5000 are years, other numbers can be converted using 'new Date(Number)', and any strings can be converted using 'new Date(String)'

* GeoJSON with no time information (appears at all times)

* KML &lt;Point&gt;s and &lt;Polygon&gt;s with no time information (appears at all times, does not include styles or other KML properties)

* Your OpenStreetMap traces (privacy set to identifiable)

Will research:

* KML geometry support beyond Point and Polygon

## Server-side: Node.js and RedisToGo

After you drop a time-enabled file onto the page, it will be POSTed to a simple Node.js server for storage in a Redis key-value database.

The HTML5 History API automatically updates the URL in your browser. Copy this URL to share your map.

If you'd prefer to use MongoDB, check the master branch of this repo.

### Setting it up on Heroku

    git clone git@github.com:mapmeld/crunchtime.git
    cd crunchtime
    heroku create YOUR-APP-NAME
    heroku addons:add redistogo
    git push heroku master

Go to YOUR-APP-NAME.heroku.com to start using the map.

## License

Crunchtime is available under an open source MIT License