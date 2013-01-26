# Crunchtime

Experimental timeline-map setup. Drop time-enabled map files onto the page. Accepts multiple files, multiple formats, and combining multiple formats.

Currently supports:

* GeoJSON with a start and/or end property. Assumes 100-5000 are years, other numbers can be converted using 'new Date(Number)', and any strings can be converted using 'new Date(String)'

* GPX files

* KMLs using &lt;coord&gt; and &lt;when&gt; tags

* KMLs using &lt;begin&gt; and &lt;end&gt; tags

* CSV files from the MyTracks Android App

* GeoJSON with no time information (appears at all times)

* KML &lt;Point&gt;s and &lt;Polygon&gt;s with no time information (appear at all times, do not include styles or other KML properties)

Will research:

* Custom CSV / TSV files

* &lt;Track&gt; in KML

* KML geometry support beyond Point and Polygon

## License

Crunchtime is available under an open source MIT License