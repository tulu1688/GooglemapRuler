RulerTool = function (map, position) {
    this.map = map;
    this.position = position;
    this.centerpos = null;
    this.listenerHandler = null;   

    this.setMap(map);
    map.parrent = this;
}

// Init overlay as Google Maps V3 overlay
RulerTool.prototype = new google.maps.OverlayView();

RulerTool.prototype.onAdd = function () {
    var me = this;
	this.listenerHandler = google.maps.event.addListener(this.map, 'idle', this.draw);
    this.initDiv();
}

RulerTool.prototype.initDiv = function(){
    var div = document.createElement('div');
    div.style.position = 'absolute';
    this.div_ = div;

    this.getPanes().overlayLayer.appendChild(div);
    this.getPanes().overlayMouseTarget.appendChild(div);
}

/**
 * Draw the FastMarkerOverlay based on the current projection and zoom level; called by Gmaps
 */
RulerTool.prototype.draw = function () {
    // weird. After mapidle, 'this' will be 'map'
    var me = null;
    if (this.parrent)
        me = this.parrent;
    else
        me = this;

    var initRulerElemListeners = function () {
        var disableDragging = function(event){
            me.map.setOptions({draggable: false});
        };

        $('#center_handle').mousedown(disableDragging)
        $('#spot_div').mousedown(disableDragging);

        var pleftstr = document.getElementById("ruler_layer").style.left;
        var ptopstr = document.getElementById("ruler_layer").style.top;

        $('#center_handle').mouseup(function(event){
            me.map.setOptions({draggable: true});

            // set new spot location
            var proj = me.getProjection();
            var leftstr = document.getElementById("center_handle").style.left;
            var topstr = document.getElementById("center_handle").style.top;

            var tmp = leftstr.split("px");
            var left = parseFloat(tmp[0]) + 60;
            tmp = topstr.split("px");
            var top = parseFloat(tmp[0]) + 60;

            var coordinates = me.getProjection().fromContainerPixelToLatLng(
                new google.maps.Point(left, top)
            );
            me.setCenterPosition(coordinates);

            setTimeout(me.draw(), 100);
        });

        $('#spot_div').mouseup(function(event){
            me.map.setOptions({draggable: true});

            // set new spot location
            var proj = me.getProjection();
            var leftstr = document.getElementById("spot_div").style.left;
            var topstr = document.getElementById("spot_div").style.top;

            var tmp = leftstr.split("px");
            var left = parseFloat(tmp[0]) + 16;
            tmp = topstr.split("px");
            var top = parseFloat(tmp[0]) + 32;

            var coordinates = me.getProjection().fromContainerPixelToLatLng(
                new google.maps.Point(left, top)
            );
            me.setEndPointPosition(coordinates);

            setTimeout(me.draw(), 100);
        });

        $("#spot_div").draggable();
        $("#center_handle").draggable();
    }

    var generateWedgeString = function (startX, startY, startAngle, endAngle, radius) {
        var x1 = startX + radius * Math.cos(Math.PI * startAngle / 180);
        var y1 = startY + radius * Math.sin(Math.PI * startAngle / 180);
        var x2 = startX + radius * Math.cos(Math.PI * endAngle / 180);
        var y2 = startY + radius * Math.sin(Math.PI * endAngle / 180);

        var largeArcFlag = endAngle < -90 ? 1 : 0;
        var pathString = "M" + x1 + " " + y1 + " A" + radius + " " + radius + " 0 " + largeArcFlag + " 1 " + x2 + " " + y2;

        return pathString;
    }

    var generateLineWithArrow = function (startX, startY, angle, radius) {
        var x2 = startX + radius * Math.cos(Math.PI * angle / 180);
        var y2 = startY + radius * Math.sin(Math.PI * angle / 180);

        var pathString = "M" + startX + " " + startY + " L" + x2 + " " + y2;

        return pathString;
    }

    var getLocWithOffset = function(map,loc,offsetx,offsety) {
        var point1 = me.map.getProjection().fromLatLngToPoint(loc);
        var point2 = new google.maps.Point(offsetx / Math.pow(2, map.getZoom()),offsety / Math.pow(2, map.getZoom()));
        return map.getProjection().fromPointToLatLng(new google.maps.Point(
            point1.x + point2.x,
            point1.y - point2.y
        ));
    }

    var proj = me.getProjection();
    var div = me.div_;
    div.id = 'ruler_layer';
    div.innerHTML = '';

    // Container
	var bounds = me.map.getBounds();
    var sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
    var ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());
    div.style.left = sw.x + 'px';
    div.style.top = ne.y + 'px';
    div.style.width = (ne.x - sw.x) + 'px';
    div.style.height = (sw.y - ne.y) + 'px';

    // Position of ruler on canvas
    var divPx = proj.fromLatLngToDivPixel(me.position);
    // Position of center on canvas
    var divCenter = null;
	if (! me.centerpos) {
		var coordinates = getLocWithOffset(me.map, me.position, -60, -60);
		me.setCenterPosition(coordinates);
	}
	divCenter = proj.fromLatLngToDivPixel(me.centerpos);
    var angle = me.getAngle();

    // Center point
    var centerPointDiv = document.createElement('div');
    centerPointDiv.id = 'center_handle';
    centerPointDiv.style.position = 'absolute';
    centerPointDiv.style.width = '120px';
    centerPointDiv.style.height = '120px';
    centerPointDiv.style.cursor = 'pointer';
    centerPointDiv.style.left = '' + (divCenter.x - 60 - sw.x) + 'px';
    centerPointDiv.style.top = '' + (divCenter.y - 60 - ne.y) + 'px';
    // Add a svg dom to draw complecated widgets
	var svgNS = "http://www.w3.org/2000/svg";
	var svgRoot = document.createElementNS(svgNS, "svg");
	svgRoot.style.width = '100%';
	svgRoot.style.height = '100%';
    // Add maker define
    var markerDef = document.createElementNS(svgNS, "defs");
    var markerArrow = document.createElementNS(svgNS, "marker");
    markerArrow.id = 'head';
    markerArrow.setAttribute('orient','auto');
    markerArrow.setAttribute('markerWidth','4');
    markerArrow.setAttribute('markerHeight','8');
    markerArrow.setAttribute('refX','4');
    markerArrow.setAttribute('refY','4');
    var arrowPath = document.createElementNS(svgNS, "path");
    arrowPath.setAttribute('d', 'M0,0 V8 L4,4 Z');
    arrowPath.setAttribute('fill', 'black');
    markerArrow.appendChild(arrowPath);
    markerDef.appendChild(markerArrow);
    // Add the X,Y axises
    var centerCircle = document.createElementNS(svgNS, "circle");
    centerCircle.setAttribute('cx','60');
    centerCircle.setAttribute('cy','60');
    centerCircle.setAttribute('r','5');
    centerCircle.setAttribute('stroke','black');
    centerCircle.setAttribute('stroke-width','0');
    centerCircle.setAttribute('opacity','0.6');
    centerCircle.setAttribute('fill','black');
    var horizontalLine = document.createElementNS(svgNS, "line");
    horizontalLine.setAttribute('x1','0');
    horizontalLine.setAttribute('y1','60');
    horizontalLine.setAttribute('x2','120');
    horizontalLine.setAttribute('y2','60');
    horizontalLine.setAttribute('stroke-width','1');
    horizontalLine.setAttribute('stroke','black');
    var verticleLine = document.createElementNS(svgNS, "line");
    verticleLine.setAttribute('x1','60');
    verticleLine.setAttribute('y1','0');
    verticleLine.setAttribute('x2','60');
    verticleLine.setAttribute('y2','120');
    verticleLine.setAttribute('stroke-width','1');
    verticleLine.setAttribute('stroke','black');
	// Create the Arc
    var arc = document.createElementNS(svgNS, "path");
    arc.setAttribute('d', generateWedgeString(60, 60, -90, angle - 90, 30));
    arc.setAttribute("stroke",'black');
    arc.setAttribute("fill", 'black');
    arc.setAttribute("stroke-opacity", 1);
    arc.setAttribute("fill-opacity", 0);
    arc.setAttribute("marker-end", "url(#head)");
    // Create the line with the direction head to the EndPoint
    var linearrow = document.createElementNS(svgNS, "path");
    linearrow.setAttribute('d', generateLineWithArrow(60, 60, angle - 90, 55));
    linearrow.setAttribute("stroke",'black');
    linearrow.setAttribute("fill", 'black');
    linearrow.setAttribute("stroke-opacity", 1);
    linearrow.setAttribute("fill-opacity", 0);
    linearrow.setAttribute("marker-end", "url(#head)");
    // Create ruler display info label
    var labelBox = document.createElementNS(svgNS, "path");
    if (angle < 90 && angle >= 0)
    	labelBox.setAttribute('d', 'M63,63 L119,63 L119,88 L63,88 z');
    else
		labelBox.setAttribute('d', 'M63,0 L119,0 L119,25 L63,25 z');
    labelBox.setAttribute("stroke",'white');
    labelBox.setAttribute("fill", 'white');
    labelBox.setAttribute("stroke-opacity", 1);
    labelBox.setAttribute("fill-opacity", 1);
    var distanceLabel = document.createElementNS(svgNS, "text");
    distanceLabel.setAttribute('x', 65);
    if (angle < 90 && angle >= 0)
    	distanceLabel.setAttribute('y', 75);
    else
    	distanceLabel.setAttribute('y', 10);
    distanceLabel.setAttribute('fill', 'black');
    distanceLabel.innerHTML = me.getDistance();
    var angleLabel = document.createElementNS(svgNS, "text");
    angleLabel.setAttribute('x', 65);
    if (angle < 90 && angle >= 0)
    	angleLabel.setAttribute('y', 87);
    else
    	angleLabel.setAttribute('y', 22);
    angleLabel.setAttribute('fill', 'black');
    var realAngle = angle < 0 ? angle + 360 : angle;
    angleLabel.innerHTML = '' + toFixed(realAngle,2) + '&deg;';
    // Add angle elements
    svgRoot.appendChild(markerDef);
    svgRoot.appendChild(horizontalLine);
    svgRoot.appendChild(verticleLine);
    svgRoot.appendChild(centerCircle);
    svgRoot.appendChild(arc);
    svgRoot.appendChild(linearrow);
    svgRoot.appendChild(labelBox);
    svgRoot.appendChild(distanceLabel);
    svgRoot.appendChild(angleLabel);
	centerPointDiv.appendChild(svgRoot);

    // End spot
    var spotDiv = document.createElement('div');
    spotDiv.id = 'spot_div';
    spotDiv.style.width = '32px';
    spotDiv.style.height = '32px';
    spotDiv.style.position = 'absolute';
    spotDiv.style.cursor = 'pointer';
    var img = document.createElement('img');
    img.src = './images/green_dot.png';
    img.style.width = '100%';
    img.style.height = '100%';
    spotDiv.appendChild(img);
    spotDiv.style.left = '' + (divPx.x - 16 - sw.x) + 'px';
    spotDiv.style.top = '' + (divPx.y - 32 - ne.y) + 'px';

	div.appendChild(centerPointDiv);
    div.appendChild(spotDiv);

    initRulerElemListeners();
}
/**
 * Get the Bearing Angle of CenterPoint and EndPoint when comparison to the True North
 */
RulerTool.prototype.getAngle = function(){
	var bearing = google.maps.geometry.spherical.computeHeading(this.centerpos,this.position);
	return bearing;
}

/**
 * Get the distance between CenterPoint and EndPoint
 */
RulerTool.prototype.getDistance = function(){
	var lat1 = this.centerpos.lat();
	var lat2 = this.position.lat();
	var lon1 = this.centerpos.lng();
	var lon2 = this.position.lng();
	var R = 6371;
	var dLat = (lat2-lat1) * Math.PI / 180;
	var dLon = (lon2-lon1) * Math.PI / 180; 
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) * 
		Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c;
	if (d>5) return Math.round(d)+"km";
	else if (d<=5) return Math.round(d*1000)+"m";
	return d;
}

/**
 * @brief Set center point position
 */
RulerTool.prototype.setCenterPosition = function (pos) {
	this.centerpos = pos;
}

/**
 * @brief Set end point position
 */
RulerTool.prototype.setEndPointPosition = function (pos) {
	this.position = pos;
}

/**
 * Remove the overlay from the map; never use the overlay again after calling this function
 */
RulerTool.prototype.onRemove = function () {
	if (! this.div_) return;
    this.div_.parentNode.removeChild(this.div_);
    delete this.div_;

    if (!this.listenerHandler) return;
    google.maps.event.removeListener(this.listenerHandler);

    this.centerpos = null;
    this.position = null;
}

///////////////////////////////////////////////////////////////////////////////
// RulerTool variables and functions
///////////////////////////////////////////////////////////////////////////////
var rulerMode = false;
var rulerTool = null;

/**
 * @brief Override javascript tofix function. The original one is too buggy
 */
function toFixed (number, precision) {
    var multiplier = Math.pow( 10, precision + 1 ),
        wholeNumber = Math.floor( number * multiplier );
    return Math.round( wholeNumber / 10 ) * 10 / multiplier;
}

function addruler(map) {
	rulerTool = new RulerTool(map, map.getCenter());
}

function clearRuler() {
	if (rulerTool) {
		rulerTool.setMap(null);
		rulerTool = null;
	}
}

function toggleRuler(){
	rulerMode = !rulerMode;

	if (rulerMode) {
		addruler(map);
	} else {
		clearRuler();
	}
}