// Script For Hero Swiper Start Here
// Script For Hero Swiper Start Here
const progressSection = document.querySelector('[sec="progress"]');

if (progressSection) {
  const ppswiper = new Swiper("[ppswiper]", {
    autoplay: {
      delay: 6000,
      disableOnInteraction: false,
    },
    allowTouchMove: false, // disables drag/swipe
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
    sliderWrap.classList.remove(
      "is-active-01",
      "is-active-02",
      "is-active-03",
      "is-active-04"
    );

    sliderWrap.classList.add(`is-active-0${ppswiper.activeIndex + 1}`);
  });
}
// Script For Hero Swiper End Here

// Script For Hero Swiper NZ Here
// Script For Hero Swiper NZ Here
const NZSection = document.querySelector('[sec="hnz"]');

if (NZSection) {
  const nzswiper = new Swiper('[swiper="nz"]', {
    effect: "fade",
    autoplay: {
      delay: 6000,
      disableOnInteraction: false,
    },
    slidesPerView: 1,
    allowTouchMove: false, // disables drag/swipe
    navigation: {
      nextEl: '[swiper-next="nz"]',
      prevEl: '[swiper-prev="nz"]',
    },
    on: {
      init: function () {
        startProgress(0);
        setupDotboxClick();
        updateActiveDot(0);
      },
      slideChange: function () {
        startProgress(nzswiper.activeIndex);
        updateActiveDot(nzswiper.activeIndex);
      },
    },
  });

  function startProgress(activeIndex) {
    let dotboxes = NZSection.querySelectorAll("[ppslidebtn]");
    let lines = NZSection.querySelectorAll("[ppslidebtn] .line");

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
    NZSection.querySelectorAll("[ppslidebtn]").forEach((dotbox, index) => {
      dotbox.addEventListener("click", () => {
        nzswiper.slideTo(index);
      });
    });
  }

  function updateActiveDot(activeIndex) {
    let dotboxes = NZSection.querySelectorAll("[ppslidebtn]");

    dotboxes.forEach((dotbox, index) => {
      if (index === activeIndex) {
        dotbox.classList.add("activedot");
      } else {
        dotbox.classList.remove("activedot");
      }
    });
  }

  nzswiper.emit("init");

  nzswiper.on("slideChange", function () {
    NZSection.classList.remove("is-active-01", "is-active-02", "is-active-03");
    NZSection.classList.add(`is-active-0${nzswiper.activeIndex + 1}`);
  });
}
// Script For nz Swiper End Here

// Script For Product Swiper Start Here
const productswiper = new Swiper('[swiper="product"]', {
  // Navigation arrows
  slidesPerView: 1.12,
  spaceBetween: 16,

  breakpoints: {
    767: {
      slidesPerView: 1.5,
    },
    1024: {
      slidesPerView: 2.35,
      spaceBetween: 24,
    },
  },
  pagination: {
    el: ".swiper-pagination",
    type: "progressbar",
  },
  navigation: {
    nextEl: '[swiper-next="product"]',
    prevEl: '[swiper-prev="product"]',
  },
});
// Script For Product Swiper End Here

// Script For Gallery Swiper Start Here
const galleryswiper = new Swiper('[swiper="gallery"]', {
  // Navigation arrows
  slidesPerView: 1.89,
  spaceBetween: 16,
  freeMode: true,
  //   centeredSlides: true,

  breakpoints: {
    767: {
      slidesPerView: 2.1,
    },
    1024: {
      slidesPerView: 4.68,
      spaceBetween: 16,
    },
  },
  pagination: {
    el: ".gallery-pagination",
    type: "progressbar",
  },
  navigation: {
    nextEl: '[swiper-next="gallery"]',
    prevEl: '[swiper-prev="gallery"]',
  },
});
// Script For Gallery Swiper End Here

// Script For Height
function setHeight(sourceSelector, targetSelector) {
  // Get the source element
  const source = document.querySelector(sourceSelector);
  const target = document.querySelector(targetSelector);

  if (source && target) {
    const sourceHeight = source.offsetHeight; // Get height (includes padding + border)
    target.style.height = `${sourceHeight}px`; // Apply height
  }
}

// Example usage with your elements
setHeight(".salmon-img-wrap", ".absolute-swiper-arrow");

// Also update on window resize
window.addEventListener("resize", () => {
  setHeight(".salmon-img-wrap", ".absolute-swiper-arrow");
});

const salmonbuttons = document.querySelectorAll("[salmon-acc]");
const salmonimages = document.querySelectorAll("[salmon-img]");

salmonbuttons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    // Remove active from all
    salmonbuttons.forEach((b) => b.classList.remove("active"));
    salmonimages.forEach((img) => img.classList.remove("active"));

    // Add active to clicked button and matching image
    btn.classList.add("active");
    salmonimages[index].classList.add("active");
  });
});

// Set first active by default
if (salmonbuttons.length > 0 && salmonimages.length > 0) {
  salmonbuttons[0].classList.add("active");
  salmonimages[0].classList.add("active");
}

var masonryGrids = document.querySelectorAll('[masnory="grid"]');

masonryGrids.forEach(function (masonryGrid) {
  new Masonry(masonryGrid, {
    itemSelector: '[masnory="grid-item"]',
    gutter: 24, // 24px horizontal gap
    percentPosition: true,
  });
});
