document.addEventListener("DOMContentLoaded", function () {
  function setSectionHeight() {
    var content = document.getElementById("new-process-content");
    var section = document.getElementById("new-process-section");
    if (!content || !section) return;
    var h = content.getBoundingClientRect().height;
    section.style.height = h + "px";
  }

  var wrapper = document.getElementById("new-process-toggle-wrapper");
  var bg = wrapper ? wrapper.querySelector(".new-process-toggle-bg") : null;
  var toggles = wrapper
    ? Array.prototype.slice.call(
        wrapper.querySelectorAll(".new-process-toggle")
      )
    : [];
  var activeToggle = null;
  var wrapperVisible = false;
  var wrapperAnimating = false;
  var pendingReposition = false;

  var images = {};
  var imageNodes = document.querySelectorAll("[data-process-image]");
  Array.prototype.forEach.call(imageNodes, function (img) {
    var key = img.getAttribute("data-process-image");
    images[key] = img;
  });

  var cards = Array.prototype.slice.call(
    document.querySelectorAll("[data-process-card]")
  );

  function styleImagesContainer() {
    var container = document.querySelector(".new-process-section-bg");
    if (container && getComputedStyle(container).position === "static")
      container.style.position = "relative";
    Array.prototype.forEach.call(imageNodes, function (img) {
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.transition = "opacity 420ms cubic-bezier(0.16, 1, 0.3, 1)";
      img.style.willChange = "opacity";
      img.style.pointerEvents = "none";
      img.style.opacity = "0";
    });
  }

  function setActiveImage(key) {
    var target = images[key];
    if (!target) return;
    Array.prototype.forEach.call(imageNodes, function (img) {
      img.style.opacity = img === target ? "1" : "0";
    });
  }

  function setActiveCards(key) {
    cards.forEach(function (card) {
      var k = card.getAttribute("data-process-card");
      card.style.display = k === key ? "" : "none";
    });
    requestAnimationFrame(setSectionHeight);
  }

  function isMobile() {
    return window.innerWidth <= 991;
  }

  function applyBgTransition() {
    if (!bg) return;
    var ease = "cubic-bezier(0.16, 1, 0.3, 1)";
    bg.style.transition = "transform 500ms " + ease;
  }

  function measureWithinWrapper(el) {
    var wr = wrapper.getBoundingClientRect();
    var tr = el.getBoundingClientRect();
    var x = tr.left - wr.left + wrapper.scrollLeft;
    var y = tr.top - wr.top + wrapper.scrollTop;
    return { x: x, y: y, w: tr.width, h: tr.height };
  }

  function moveBgTo(el) {
    if (!wrapper || !bg || !el) return;
    if (wrapperAnimating) {
      pendingReposition = true;
      return;
    }
    var m = measureWithinWrapper(el);
    bg.style.width = m.w + "px";
    bg.style.height = m.h + "px";
    bg.style.transform = "translate3d(" + m.x + "px," + m.y + "px,0)";
  }

  function updateToggleColors() {
    if (isMobile()) {
      toggles.forEach(function (t) {
        t.style.color = "var(--swatches--black)";
        t.style.opacity = t === activeToggle ? "1" : "0.4";
      });
    } else {
      toggles.forEach(function (t) {
        t.style.color =
          t === activeToggle
            ? "var(--swatches--black)"
            : "var(--swatches--white)";
        t.style.opacity = "1";
      });
    }
  }

  function scrollToSectionTop() {
    var section = document.getElementById("new-process-section");
    if (!section) return;
    var r = section.getBoundingClientRect();
    var y = window.scrollY + r.top;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function setActiveToggle(el, shouldScroll) {
    if (!el) return;
    activeToggle = el;
    var key = el.getAttribute("data-process-toggle") || "";
    moveBgTo(el);
    updateToggleColors();
    if (key) {
      setActiveImage(key);
      setActiveCards(key);
    }
    if (shouldScroll) scrollToSectionTop();
  }

  function findToggleByKey(key) {
    if (!wrapper) return null;
    return wrapper.querySelector('[data-process-toggle="' + key + '"]');
  }

  function removeViewParam() {
    var u = new URL(window.location.href);
    if (u.searchParams.has("view")) {
      u.searchParams.delete("view");
      history.replaceState(null, "", u.toString());
    }
  }

  function initBg() {
    if (!wrapper || !bg || !toggles.length) return;
    if (getComputedStyle(wrapper).position === "static")
      wrapper.style.position = "relative";
    bg.style.position = "absolute";
    bg.style.top = "0";
    bg.style.left = "0";
    bg.style.willChange = "transform,width,height";
    bg.style.pointerEvents = "none";
    bg.style.transition = "none";

    var params = new URLSearchParams(window.location.search);
    var viewKey = params.get("view");
    var hadViewParam = !!viewKey;
    var defaultToggle = viewKey ? findToggleByKey(viewKey) : null;
    if (!defaultToggle)
      defaultToggle = findToggleByKey("hot-smoked") || toggles[0];
    activeToggle = defaultToggle;

    styleImagesContainer();
    var initKey = activeToggle
      ? activeToggle.getAttribute("data-process-toggle")
      : "";
    if (initKey) {
      setActiveImage(initKey);
      setActiveCards(initKey);
    }

    moveBgTo(activeToggle);
    updateToggleColors();

    requestAnimationFrame(function () {
      applyBgTransition();
      if (hadViewParam) {
        scrollToSectionTop();
        setTimeout(removeViewParam, 0);
      }
    });
  }

  function onToggleClick(e) {
    e.preventDefault();
    var t = e.currentTarget;
    setActiveToggle(t, true);
    removeViewParam();
  }

  function onResize() {
    setSectionHeight();
    applyBgTransition();
    updateToggleColors();
    computeThresholds();
    if (activeToggle) moveBgTo(activeToggle);
    if (!wrapperVisible) setWrapperHiddenInstant();
    updateWrapperVisibility();
  }

  setSectionHeight();
  initBg();

  toggles.forEach(function (t) {
    t.addEventListener("click", onToggleClick, false);
  });
  window.addEventListener("resize", onResize, false);

  var contentEl = document.getElementById("new-process-content");
  if (contentEl && typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      requestAnimationFrame(function () {
        setSectionHeight();
        updateWrapperVisibility();
        if (activeToggle) moveBgTo(activeToggle);
      });
    });
    ro.observe(contentEl);
  } else {
    window.addEventListener(
      "load",
      function () {
        setSectionHeight();
        updateWrapperVisibility();
        if (activeToggle) moveBgTo(activeToggle);
      },
      false
    );
  }

  var sectionEl = document.getElementById("new-process-section");
  var SHOW_TOP_OFFSET = 0;
  var HIDE_BOTTOM_OFFSET = 0;

  function computeThresholds() {
    SHOW_TOP_OFFSET = Math.round(window.innerHeight * 0.05);
    HIDE_BOTTOM_OFFSET = Math.round(window.innerHeight * 1.0);
  }

  function offscreenTransform() {
    return isMobile() ? "translate3d(0,120%,0)" : "translate3d(-120%,0,0)";
  }

  function setWrapperHiddenInstant() {
    if (!wrapper) return;
    wrapper.style.willChange = "transform,opacity";
    wrapper.style.transition = "none";
    wrapper.style.opacity = "0";
    wrapper.style.transform = offscreenTransform();
    wrapper.style.pointerEvents = "none";
    requestAnimationFrame(function () {
      wrapper.style.transition =
        "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)";
    });
  }

  function onWrapperTransitionEnd(e) {
    if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
    wrapperAnimating = false;
    if (pendingReposition) {
      pendingReposition = false;
      if (activeToggle) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            moveBgTo(activeToggle);
          });
        });
      }
    }
  }

  function showWrapper() {
    if (!wrapper || wrapperVisible) return;
    wrapperVisible = true;
    wrapperAnimating = true;
    wrapper.style.opacity = "1";
    wrapper.style.transform = "translate3d(0,0,0)";
    wrapper.style.pointerEvents = "auto";
  }

  function hideWrapper() {
    if (!wrapper || !wrapperVisible) return;
    wrapperVisible = false;
    wrapperAnimating = true;
    wrapper.style.opacity = "0";
    wrapper.style.transform = offscreenTransform();
    wrapper.style.pointerEvents = "none";
  }

  function updateWrapperVisibility() {
    if (!sectionEl || !wrapper) return;
    var r = sectionEl.getBoundingClientRect();
    var shouldShow = r.top <= SHOW_TOP_OFFSET && r.bottom > HIDE_BOTTOM_OFFSET;
    if (shouldShow) showWrapper();
    else hideWrapper();
  }

  computeThresholds();
  setWrapperHiddenInstant();
  updateWrapperVisibility();

  if (wrapper) {
    wrapper.addEventListener("transitionend", onWrapperTransitionEnd, false);
  }

  window.addEventListener(
    "scroll",
    function () {
      updateWrapperVisibility();
      if (wrapperVisible && activeToggle && !wrapperAnimating)
        moveBgTo(activeToggle);
    },
    { passive: true }
  );
});
