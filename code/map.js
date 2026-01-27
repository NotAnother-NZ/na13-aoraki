// Global variables
var map;
var markers = [];
var activeMarker = null;

// Initialize map when Google Maps API loads
function initMap() {
  console.log("Initializing Google Maps...");
  // Monaco coordinates
  var monaco = { lat: -36.7281436, lng: 174.7079381 };
  // Create map
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: monaco,
    mapTypeId: "roadmap",
    styles: [
      {
        featureType: "all",
        elementType: "geometry.fill",
        stylers: [{ color: "#f5f5f5" }],
      },
      {
        featureType: "water",
        elementType: "geometry.fill",
        stylers: [{ color: "#c9c9c9" }],
      },
    ],
  });
  console.log("Map created successfully");
  // Add markers for all locations
  addMarkers();
  // Setup location list interactions
  setupLocationInteractions();
}

// Add markers to the map
function addMarkers() {
  var locations = [];
  // Read location data from HTML elements
  $("[locations_item]").each(function (index) {
    var locationItem = $(this);
    var lat = parseFloat(locationItem.find("[latitude]").text().trim());
    var lng = parseFloat(locationItem.find("[longitude]").text().trim());
    var name = locationItem.find("[location_name]").text().trim();
    var locationaddress = locationItem.find("[location_address]").text().trim();
    var storelink = locationItem.find("[storelink]").attr("href");
    var directionlink = locationItem.find("[direction_link]").text().trim();
    var category = locationItem.find("[location_category]").text().trim();
    if (lat && lng && name) {
      locations.push({
        lat: lat,
        lng: lng,
        name: name,
        address: locationaddress,
        direction: directionlink,
        store: storelink,
        category: category,
      });
    }
  });
  console.log("Found", locations.length, "locations from HTML");
  locations.forEach(function (location, index) {
    // Create custom marker icon
    var markerIcon = {
      url: "https://cdn.prod.website-files.com/689579fae931a5803e812511/68ddff34da2f223735488f35_Pin.svg",
      scaledSize: new google.maps.Size(48, 48),
      anchor: new google.maps.Point(11, 30),
    };
    // Create marker
    var marker = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: map,
      title: location.name,
      icon: markerIcon,
    });
    // Create info window content
    var infoContent = `
      

      <div class="map-popup">
      <div class="map-name">${location.name}</div>
      <div class="map-popupdesc">${location.address}</div>
      <a  href="${location.store}" target="_blank" class="mapstore-btn">Store Details</a>
      
      <a href="${location.direction}" target="_blank"  class="direction-btn">Direction</a>
      </div>

    `;
    var infoWindow = new google.maps.InfoWindow({
      content: infoContent,
    });
    // Add click event to marker
    marker.addListener("click", function () {
      // Close any open info windows
      markers.forEach(function (m) {
        if (m.infoWindow) m.infoWindow.close();
      });
      // Open this marker's info window
      infoWindow.open(map, marker);
      // Highlight corresponding list item
      highlightLocationItem(index);
      // Center map on marker
      map.setCenter(marker.getPosition());
      map.setZoom(14);
    });
    // Store marker and info window
    marker.infoWindow = infoWindow;
    marker.locationIndex = index;
    markers.push(marker);
  });
  console.log("Added", markers.length, "markers to map");
}

// Setup interactions with location list items
function setupLocationInteractions() {
  $("[locations_item]").each(function (index) {
    var locationItem = $(this);
    // Remove any existing click handlers to avoid duplicates
    locationItem.off("click");
    locationItem.on("click", function () {
      // Find the corresponding marker by matching coordinates
      var lat = parseFloat(locationItem.find("[latitude]").text().trim());
      var lng = parseFloat(locationItem.find("[longitude]").text().trim());
      var correspondingMarker = markers.find(function (marker) {
        var markerPos = marker.getPosition();
        return (
          Math.abs(markerPos.lat() - lat) < 0.0001 &&
          Math.abs(markerPos.lng() - lng) < 0.0001
        );
      });
      if (correspondingMarker) {
        // Close any open info windows
        markers.forEach(function (marker) {
          if (marker.infoWindow) marker.infoWindow.close();
        });
        // Open marker's info window
        correspondingMarker.infoWindow.open(map, correspondingMarker);
        // Center map on marker
        map.setCenter(correspondingMarker.getPosition());
        map.setZoom(14);
        // Highlight list item
        highlightLocationItem(index);
      }
    });
  });
}

// Highlight location item in list
function highlightLocationItem(index) {
  // Remove active class from all items
  $("[locations_item]").removeClass("location_active");
  // Add active class to clicked item
  $("[locations_item]").eq(index).addClass("location_active");
  // Scroll to item
  $("[locations_item]").eq(index)[0].scrollIntoViewIfNeeded({
    behavior: "smooth",
    block: "nearest",
    inline: "start",
  });
}

// Get directions function
function getDirections(lat, lng) {
  var directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(directionsUrl, "_blank");
}

// Function to refresh markers when HTML content changes
function refreshMarkers() {
  // Clear existing markers
  markers.forEach(function (marker) {
    marker.setMap(null);
  });
  markers = [];
  // Re-add markers from current HTML content
  addMarkers();
}

setTimeout(function () {
  console.log("Re-initializing the whole map after 5 seconds...");
  initMap();
}, 5000);

// Re-initialize markers after 5 seconds (5000ms)
setTimeout(function () {
  console.log("Refreshing map markers after 5 seconds...");
  refreshMarkers();
}, 5000);
