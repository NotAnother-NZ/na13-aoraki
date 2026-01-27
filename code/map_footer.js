// Wait for DOM to be ready
$(document).ready(function () {
  console.log("DOM ready, waiting for Google Maps API...");
  // Observe changes to the locations list for dynamic updates
  var listWrapper = document.getElementById("locations_list");
  if (listWrapper) {
    var observer = new MutationObserver(function (mutationsList) {
      for (var mutation of mutationsList) {
        if (mutation.type === "childList") {
          console.log("Location list changed, refreshing markers...");
          refreshMarkers();
        }
      }
    });
    observer.observe(listWrapper, { childList: true });
  }
});

const searchInput = document.querySelector(".search-field");

// Always add search_active on page load
document.body.classList.add("search_inactive");

// Handle typing
searchInput.addEventListener("input", function () {
  if (this.value.trim() !== "") {
    document.body.classList.remove("search_inactive");
  } else {
    document.body.classList.add("search_inactive");
  }
});
