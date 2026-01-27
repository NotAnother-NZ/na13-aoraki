// Masonry Grid
var grid = document.querySelector('[masnory="grid"]');
if (grid) {
  var msnry = new Masonry(grid, {
    itemSelector: '[masnory="grid-item"]',
    gutter: 24,
    percentPosition: true,
  });
}

window.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector("[navbar]");
  const productgallery = document.querySelector("[product-gallery]");

  if (navbar && productgallery) {
    const navbarHeight = navbar.offsetHeight;
    productgallery.style.paddingTop = `${navbarHeight}px`;
  }
});

const progressSection = document.querySelector('[sec="progress"]');

if (progressSection) {
  const ppswiper = new Swiper("[ppswiper]", {
    autoplay: {
      delay: 6000,
      disableOnInteraction: false,
    },
    allowTouchMove: false, // disables drag/swipe
    navigation: {
      nextEl: '[swiper-next="ppswiper"]',
      prevEl: '[swiper-prev="ppswiper"]',
    },
    effect: "fade",
    slidesPerView: 1,
    on: {
      init: function () {
        startProgress(0);
        setupDotboxClick();
        updateActiveDot(0);
      },
      slideChange: function () {
        startProgress(ppswiper.activeIndex);
        updateActiveDot(ppswiper.activeIndex);
      },
    },
  });

  function startProgress(activeIndex) {
    let dotboxes = progressSection.querySelectorAll("[ppslidebtn]");
    let lines = progressSection.querySelectorAll("[ppslidebtn] .line");

    dotboxes.forEach((dotbox, index) => {
      dotbox.classList.remove("progress-done");

      if (index < activeIndex) {
        lines[index].style.transition = "none";
        lines[index].style.width = "100%";
        dotbox.classList.add("progress-done");
      } else if (index === activeIndex) {
        lines[index].style.transition = "none";
        lines[index].style.width = "0%";

        setTimeout(() => {
          lines[index].style.transition = "width 6s linear";
          lines[index].style.width = "100%";
        }, 50);
      } else {
        lines[index].style.transition = "none";
        lines[index].style.width = "0%";
      }
    });
  }

  function setupDotboxClick() {
    progressSection
      .querySelectorAll("[ppslidebtn]")
      .forEach((dotbox, index) => {
        dotbox.addEventListener("click", () => {
          ppswiper.slideTo(index);
        });
      });
  }

  function updateActiveDot(activeIndex) {
    let dotboxes = progressSection.querySelectorAll("[ppslidebtn]");

    dotboxes.forEach((dotbox, index) => {
      if (index === activeIndex) {
        dotbox.classList.add("activedot");
      } else {
        dotbox.classList.remove("activedot");
      }
    });
  }

  ppswiper.emit("init");

  ppswiper.on("slideChange", function () {
    var sliderWrap = progressSection;
    sliderWrap.classList.remove("is-active-01", "is-active-02", "is-active-03");

    sliderWrap.classList.add(`is-active-0${ppswiper.activeIndex + 1}`);
  });
}

// Product Swiper
const otherproductswiper = document.querySelector('[swiper="product"]');
if (otherproductswiper) {
  new Swiper(otherproductswiper, {
    slidesPerView: 1.2,
    spaceBetween: 16,

    breakpoints: {
      767: {
        slidesPerView: 2.25,
      },
      1024: {
        slidesPerView: 4,
        spaceBetween: 24,
      },
    },
    pagination: {
      el: ".productswiper-pagination",
      type: "progressbar",
    },
    navigation: {
      nextEl: '[swiper-next="product"]',
      prevEl: '[swiper-prev="product"]',
    },
  });
}

// Image Swiper
const productgalleryswiper = document.querySelector('[swiper="image"]');
if (productgalleryswiper) {
  new Swiper(productgalleryswiper, {
    slidesPerView: 1.05,
    spaceBetween: 16,
    pagination: {
      el: ".swiper-pagination",
      type: "progressbar",
    },
    breakpoints: {
      1024: {
        slidesPerView: 1.5,
        spaceBetween: 24,
      },
    },
    navigation: {
      nextEl: '[swiper-next="image"]',
      prevEl: '[swiper-prev="image"]',
    },
  });
}

// Key Swiper
const productkeyswiper = document.querySelector('[swiper="key"]');
if (productkeyswiper) {
  new Swiper(productkeyswiper, {
    slidesPerView: 1.1,
    spaceBetween: 16,
    pagination: {
      el: ".keyswiper-pagination",
      type: "progressbar",
    },
    breakpoints: {
      768: {
        slidesPerView: 1.75,
        spaceBetween: 24,
      },
      1024: {
        slidesPerView: 2.9,
        spaceBetween: 24,
      },
    },
    navigation: {
      nextEl: '[swiper-next="key"]',
      prevEl: '[swiper-prev="key"]',
    },
  });
}
