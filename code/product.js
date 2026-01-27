// Script For Logo Swiper Start Here
const galleryswiper = new Swiper('[swiper="partner"]', {
  // Navigation arrows
  slidesPerView: 1.1,
  spaceBetween: 24,
  freeMode: true,
  //   centeredSlides: true,

  breakpoints: {
    767: {
      slidesPerView: 2.1,
    },
    1024: {
      slidesPerView: 4,
    },
  },
  pagination: {
    el: ".partner-pagination",
    type: "progressbar",
  },
  navigation: {
    nextEl: '[swiper-next="partner"]',
    prevEl: '[swiper-prev="partner"]',
  },
});
// Script For Logo Swiper End Here
