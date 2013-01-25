# Crunchtime

Experimental timeline-map setup

Currently supports:

* GeoJSON with no time information (appears at all times)

* GeoJSON with a start and/or end property. Assumes 100-5000 are years, other numbers can be converted using 'new Date(Number)', and any strings can be converted using 'new Date(String)'

* KMLs using &lt;coord&gt; and &lt;when&gt; tags (based on samples from Google's My Tracks Android app)

* KMLs using &lt;begin&gt; and &lt;end&gt; tags (based on samples from http://MajuroJS.org/draw/chicago )

* KML Points and Polygons with no time information (appear at all times, do not include styles or other KML properties)

Will research:

* &lt;Track&gt; in KML

## License

Crunchtime is available under an open source MIT License