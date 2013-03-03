# Crunchtime

Experimental timeline-map setup. Drop time-enabled map files onto the page. Accepts multiple files, multiple formats, and combining multiple formats.

<img src="https://raw.github.com/mapmeld/crunchtime/master/howcrunchtimeworks.png"/>

## Currently supports:

* GPX files

* KMLs using &lt;coord&gt; and &lt;when&gt; tags

* KMLs using &lt;begin&gt; and &lt;end&gt; tags

* Any CSV with valid latitude, longitude, and time readable by JavaScript Date( TIME * 1 ) or Date( TIME )

* GeoJSON with a start and/or end property. Assumes 100-5000 are years, other numbers can be converted using 'new Date(Number)', and any strings can be converted using 'new Date(String)'

* GeoJSON with no time information (appears at all times)

* KML &lt;Point&gt;s and &lt;Polygon&gt;s with no time information (appears at all times, does not include styles or other KML properties)

Will research:

* KML geometry support beyond Point and Polygon

## License

Crunchtime is available under an open source MIT License