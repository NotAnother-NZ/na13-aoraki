(function () {
  const DEFAULT_SLIDE_DURATION = 5000;
  const PROGRESS_FADE_MS = 300;

  function loadAsset(type, attrs) {
    return new Promise((resolve, reject) => {
      const el = document.createElement(type);
      Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }
  function ensureSwiperAssets() {
    const hasCSS = !!document.querySelector(
      'link[href*="swiper-bundle.min.css"]'
    );
    const hasJS = !!window.Swiper;
    const tasks = [];
    if (!hasCSS)
      tasks.push(
        loadAsset("link", {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
        })
      );
    if (!hasJS)
      tasks.push(
        loadAsset("script", {
          src: "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
          defer: "",
        })
      );
    return tasks.length === 0 ? Promise.resolve() : Promise.all(tasks);
  }
  function injectOnce() {
    if (document.getElementById("news-showcase-dyn-css")) return;
    const s = document.createElement("style");
    s.id = "news-showcase-dyn-css";
    s.textContent =
      ".slider-progress-wrapper-outer{opacity:0;transform:translateY(6px);transition:opacity " +
      PROGRESS_FADE_MS +
      "ms ease,transform " +
      PROGRESS_FADE_MS +
      "ms ease}.slider-progress-wrapper-outer.is-visible{opacity:1;transform:none}.slider-progress-bar{width:0;will-change:width}";
    document.head.appendChild(s);
  }
  function qs(root, sel) {
    return root.querySelector(sel);
  }
  function qsa(root, sel) {
    return Array.from(root.querySelectorAll(sel));
  }
  function readDurationFromItem(item) {
    const raw = item.getAttribute("data-slide-duration");
    if (!raw) return DEFAULT_SLIDE_DURATION;
    const n = parseInt(raw, 10);
    return isNaN(n) || n < 0 ? DEFAULT_SLIDE_DURATION : n;
  }
  function buildSwiper(section) {
    const list = qs(section, ".news-showcase-slider-list");
    if (!list) return null;
    const items = qsa(list, ":scope > .news-showcase-slider-list-item");
    if (items.length < 2)
      return { list, items, container: null, wrapper: null };
    const container = document.createElement("div");
    container.className = "swiper";
    const wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper";
    items.forEach((item) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.appendChild(item);
      wrapper.appendChild(slide);
    });
    list.innerHTML = "";
    container.appendChild(wrapper);
    list.appendChild(container);
    return { list, items, container, wrapper };
  }
  function setupProgress(section, swiper, originalCount) {
    const outer = qs(section, ".slider-progress-wrapper-outer");
    const wrapper = qs(section, ".slider-progress-wrapper");
    if (!outer || !wrapper) return null;
    let bars = qsa(wrapper, ":scope > .slider-progress");
    if (!bars.length) {
      const proto = document.createElement("div");
      proto.className = "slider-progress type3";
      proto.innerHTML = '<div class="slider-progress-bar type3"></div>';
      wrapper.appendChild(proto);
      bars = [proto];
    }
    const proto = bars[0];
    while (wrapper.children.length > 1)
      wrapper.removeChild(wrapper.lastElementChild);
    for (let i = 1; i < originalCount; i++)
      wrapper.appendChild(proto.cloneNode(true));
    bars = qsa(wrapper, ":scope > .slider-progress");
    function barAt(i) {
      return bars[i] ? qs(bars[i], ".slider-progress-bar") : null;
    }
    function snap(el, pct) {
      if (!el) return;
      el.style.transitionProperty = "width";
      el.style.transitionTimingFunction = "linear";
      el.style.transitionDuration = "0ms";
      el.style.width = pct;
    }
    function animate(i, dur) {
      const el = barAt(i);
      if (!el) return;
      snap(el, "0%");
      void el.offsetWidth;
      el.style.transitionDuration = dur + "ms";
      el.style.width = "100%";
    }
    function finish(i) {
      const el = barAt(i);
      if (!el) return;
      el.style.transitionDuration = "0ms";
      el.style.width = "100%";
    }
    function resetAll() {
      bars.forEach((_, i) => snap(barAt(i), "0%"));
    }
    function resetAndAnimate(i, dur) {
      snap(barAt(i), "0%");
      void wrapper.offsetWidth;
      animate(i, dur);
    }
    return {
      outer,
      resetAll,
      animate,
      finish,
      barCount: bars.length,
      barAt,
      resetAndAnimate,
    };
  }
  function computeDurations(swiper) {
    const map = new Map();
    const slides = swiper.slides;
    for (let i = 0; i < slides.length; i++) {
      const idx = slides[i].swiperSlideIndex;
      if (typeof idx === "number" && !map.has(idx)) {
        const item = slides[i].querySelector(".news-showcase-slider-list-item");
        map.set(idx, readDurationFromItem(item || slides[i]));
      }
    }
    return map;
  }
  function init() {
    const section = document.getElementById("news-showcase-section");
    if (!section) return;
    injectOnce();
    const built = buildSwiper(section);
    if (!built) return;
    const { items, container } = built;
    const outerWrap = qs(section, ".slider-progress-wrapper-outer");
    if (!container || items.length < 2) {
      if (outerWrap) {
        outerWrap.classList.remove("is-visible");
        outerWrap.style.opacity = "0";
        outerWrap.style.transform = "translateY(6px)";
      }
      return;
    }
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const swiper = new Swiper(container, {
      init: false,
      loop: true,
      effect: "fade",
      fadeEffect: { crossFade: true },
      speed: 600,
      allowTouchMove: isTouchDevice,
      simulateTouch: false,
      autoplay: { delay: DEFAULT_SLIDE_DURATION, disableOnInteraction: false },
    });
    let durations;
    let progress;
    swiper.on("init", () => {
      const cards = qsa(section, ".news-showcase-card");
      if (cards.length > 0) {
        let maxHeight = 0;
        cards.forEach((card) => {
          card.style.height = "auto";
        });
        cards.forEach((card) => {
          const h = card.offsetHeight;
          if (h > maxHeight) maxHeight = h;
        });
        cards.forEach((card) => {
          card.style.height = maxHeight + "px";
        });
      }
      durations = computeDurations(swiper);
      progress = setupProgress(section, swiper, items.length);
      const d0 = durations.get(swiper.realIndex) || DEFAULT_SLIDE_DURATION;
      if (swiper.autoplay && swiper.autoplay.setDelay)
        swiper.autoplay.setDelay(d0);
      if (progress) {
        progress.resetAll();
        progress.outer.classList.add("is-visible");
        progress.animate(swiper.realIndex, d0);
      }
    });
    swiper.on("slideChangeTransitionStart", () => {
      if (
        progress &&
        typeof swiper.previousRealIndex === "number" &&
        swiper.previousRealIndex >= 0
      )
        progress.finish(swiper.previousRealIndex);
      if (
        progress &&
        swiper.realIndex === 0 &&
        typeof swiper.previousRealIndex === "number" &&
        swiper.previousRealIndex === progress.barCount - 1
      )
        progress.resetAll();
    });
    swiper.on("slideChangeTransitionEnd", () => {
      const d = durations.get(swiper.realIndex) || DEFAULT_SLIDE_DURATION;
      if (swiper.autoplay && swiper.autoplay.setDelay)
        swiper.autoplay.setDelay(d);
      if (progress) progress.animate(swiper.realIndex, d);
    });
    let isHovered = false;
    function pauseAutoplayAndFreezeBar() {
      if (isHovered) return;
      isHovered = true;
      const currentBar =
        progress && progress.barAt ? progress.barAt(swiper.realIndex) : null;
      if (currentBar) {
        const cs = window.getComputedStyle(currentBar);
        const px = cs.width;
        currentBar.style.transitionDuration = "0ms";
        currentBar.style.width = px;
      }
      if (swiper.autoplay && swiper.autoplay.running) swiper.autoplay.stop();
    }
    function resumeAutoplayWithFullReset() {
      if (!isHovered) return;
      isHovered = false;
      const full = durations
        ? durations.get(swiper.realIndex) || DEFAULT_SLIDE_DURATION
        : DEFAULT_SLIDE_DURATION;
      if (swiper.autoplay && swiper.autoplay.setDelay)
        swiper.autoplay.setDelay(full);
      if (progress && progress.resetAndAnimate)
        progress.resetAndAnimate(swiper.realIndex, full);
      if (swiper.autoplay) swiper.autoplay.start();
    }
    if (container) {
      container.addEventListener("mouseenter", pauseAutoplayAndFreezeBar);
      container.addEventListener("mouseleave", resumeAutoplayWithFullReset);
    }
    swiper.init();
  }
  document.addEventListener("DOMContentLoaded", function () {
    ensureSwiperAssets().then(init);
  });
})();
