# Crunchtime

1) Drop time-enabled map files onto the page.

2) Copy the URL

3) Repeat

Accepts multiple files, multiple formats, and combining multiple formats.

<img src="http://i.imgur.com/wEBrQS6.png"/>

## Currently supports:

* GPX files

* KML &lt;Track&gt;s using &lt;coord&gt; and &lt;when&gt; tags

* &lt;TimeStamp&gt;&lt;when&gt; in KML

* KMLs using &lt;begin&gt; and &lt;end&gt; tags

* CSV files from the MyTracks Android App

* GeoJSON with a start and/or end property. Assumes 100-5000 are years, other numbers can be converted using 'new Date(Number)', and any strings can be converted using 'new Date(String)'

* GeoJSON with no time information (appears at all times)

* KML &lt;Point&gt;s and &lt;Polygon&gt;s with no time information (appears at all times, does not include styles or other KML properties)

Will research:

* Custom CSV / TSV files

* KML geometry support beyond Point and Polygon

## License

Crunchtime is available under an open source MIT License