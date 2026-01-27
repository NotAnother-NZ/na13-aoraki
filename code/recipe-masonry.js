// var grid = document.querySelector('[masnory="grid"]');
// var msnry = new Masonry(grid, {
//   itemSelector: '[masnory="grid-item"]',
//   gutter: 24,
//   percentPosition: true,
// });

// // whenever any select with [select] attribute changes → relayout
// document.querySelectorAll("select[select]").forEach(function (select) {
//   select.addEventListener("change", function () {
//     // small delay in case filtering script hides items asynchronously
//     setTimeout(function () {
//       msnry.layout();
//     }, 100);
//   });
// });

// setTimeout(function () {
//   // Watch load more
//   const loadMore = document.querySelector("[loadmore]");
//   if (loadMore) {
//     loadMore.addEventListener("click", function () {
//       setTimeout(function () {
//         msnry.layout();
//       }, 100);
//     });
//   }
// }, 2000);

var grid = document.querySelector('[masnory="grid"]'); // <-- fix typo if needed
var msnry = new Masonry(grid, {
  itemSelector: '[masnory="grid-item"]',
  gutter: 24,
  percentPosition: true,
});

function relayoutMasonry() {
  imagesLoaded(grid, function () {
    msnry.reloadItems();
    msnry.layout();
  });
}

// Relayout after select change
document.querySelectorAll("select[select]").forEach(function (select) {
  select.addEventListener("change", function () {
    setTimeout(relayoutMasonry, 100);
  });
});

// Relayout after "Load More"
setTimeout(function () {
  const loadMore = document.querySelector("[loadmore]");
  if (loadMore) {
    loadMore.addEventListener("click", function () {
      setTimeout(relayoutMasonry, 100);
    });
  }
}, 400);
