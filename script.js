var generatePDF = function() {
  var pdf_download = document.getElementById("pdf_download");
  pdf_download.addEventListener('click', instantiateAPI); // listens to button click to start generation

  // Adapted from https://dronedeploy.gitbooks.io/dronedeploy-apps/content/tiles/example-tiles-as-array.html in API Docs
  // returns array of tiles given geometry and zoom level
  function getTilesFromGeometry(template, zoom, xwidth, ywidth, top_tile, left_tile){
    function replaceInTemplate(point){
      return template.replace('{z}', point.z)
        .replace('{x}', point.x)
        .replace('{y}', point.y);
    }

    var tiles = [];
    for (var y = top_tile; y < top_tile + ywidth; y++) {
      for (var x = left_tile; x < left_tile + xwidth; x++) {
        tiles.push(replaceInTemplate({x, y, z: zoom}))
      }
    }
    return tiles;
  }

// Adapted from https://dronedeploy.gitbooks.io/dronedeploy-apps/content/tiles/example-tiles-as-array.html in API Docs
// here we return an object that contains the zoom level, xwidth/ywidth and the top most/ left most tile
function getZoom(geometry) {
  var allLat = geometry.map(function(point){
    return point.lat;
  });
  var allLng = geometry.map(function(point){
    return point.lng;
  });

  function long2tile(lon,zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
  }
  function lat2tile(lat,zoom) {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
  }

  var minLat = Math.min.apply(null, allLat);
  var maxLat = Math.max.apply(null, allLat);
  var minLng = Math.min.apply(null, allLng);
  var maxLng = Math.max.apply(null, allLng);
  var zoom = 45; // choose an arbitrary large zoom level to start with
    while (zoom > 0) {
      var top_tile    = lat2tile(maxLat, zoom);
      var left_tile   = long2tile(minLng, zoom);
      var bottom_tile = lat2tile(minLat, zoom);
      var right_tile  = long2tile(maxLng, zoom);
      var xwidth = (right_tile + 1) - left_tile;
      var ywidth = (bottom_tile + 1) - top_tile;

      if (xwidth <= 3 && ywidth <= 4) {
        // found appropriate zoom level (max at this point is 3 x 4)
        return {zoom: zoom, xwidth: xwidth, ywidth: ywidth, topTile: top_tile, leftTile: left_tile}
      }
      if (xwidth <= 4 && ywidth <= 3) {
        // found appropriate zoom level (max at this point is 4 x 3)
        return {zoom: zoom, xwidth: xwidth, ywidth: ywidth, topTile: top_tile, leftTile: left_tile}
      }
      zoom--;
    }
  }
  // instantiate api and process images and tiles
  function instantiateAPI() {
    new DroneDeploy({version: 1}).then(function(dronedeploy){
      dronedeploy.Plans.getCurrentlyViewed().then(function(plan){
        var zoom = getZoom(plan.geometry);

        dronedeploy.Tiles.get({planId: plan.id, layerName: 'ortho', zoom: zoom.zoom})
          .then(function(res){
              var tiles = getTilesFromGeometry(res.template, zoom.zoom, zoom.xwidth, zoom.ywidth, zoom.topTile, zoom.leftTile);
              var canvas = document.createElement('canvas'); // use canvas to draw image and obtain its dataURL
              canvas.width = 256 * zoom.xwidth;
              canvas.height = 256 * zoom.ywidth;
              var ctx = canvas.getContext('2d');
              var dataURL;
              var imageProgress = 0;
                // iterate through our tiles and convert it to a canvas object
                for (var y = 0; y < zoom.ywidth; y++) {
                  for (var x = 0; x < zoom.xwidth; x++) {
                    var img = document.createElement('img');
                    var corsRedirectURL = 'https://cors-anywhere.herokuapp.com/';
                    img.src = corsRedirectURL + tiles[(y * zoom.xwidth) + x];
                    img.dataset.x = x;
                    img.dataset.y = y;
                    img.crossOrigin = "Anonymous";
                    img.onload = function () {
                      ctx.drawImage(this, 256 * this.dataset.x, 256 * this.dataset.y, 256, 256);
                      imageProgress++;
                      if (imageProgress == zoom.xwidth* zoom.ywidth) {
                        // at this point we have processed all tiles and can obtain the canvas dataURL
                        dataURL = canvas.toDataURL();
                        dataURLToPDf(zoom,dataURL,plan);
                      }
                    };
                  }
                }
                //Letting user know that the pdf is being processed
                dronedeploy.Messaging.showToast('Downloading PDF... Please Wait', {timeout: 1000});
              });
            });
          });


      }

  // takes input dataURL and downlads converted PDF into users browser
  function dataURLToPDf(zoom, dataURL,plan){
      var doc = new jsPDF({unit: 'pt'}); // jsPDF can handle different units and 'pt' (points) is appropriate for maps
      doc.addImage(dataURL, 'PNG', 0, 0, 192 * zoom.xwidth, 192 * zoom.ywidth);
      doc.save(plan.name + '_map.pdf');
    }
  }

// initializes app when map view is loaded
document.addEventListener('DOMContentLoaded', function() {
    generatePDF();
});
