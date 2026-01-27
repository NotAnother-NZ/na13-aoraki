(function () {
  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function injectStyles() {
    if (document.getElementById("announcement-marquee-styles")) return;
    var css =
      "" +
      ".announcement-marquee-viewport{position:relative;overflow:hidden;white-space:nowrap}" +
      ".announcement-marquee-track{display:inline-flex;align-items:center;will-change:transform;animation-name:announcementMarqueeScroll;animation-timing-function:linear;animation-iteration-count:infinite;animation-play-state:running}" +
      ".announcement-marquee-segment{display:inline-block;padding-right:2rem;white-space:nowrap}" +
      "@keyframes announcementMarqueeScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}";
    var s = document.createElement("style");
    s.id = "announcement-marquee-styles";
    s.textContent = css;
    document.head.appendChild(s);
    console.log("[announcement] styles injected");
  }
  function firstChildElement(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 1) return n;
    }
    return null;
  }
  function restore(inner) {
    console.log("[announcement] restore called");
    if (!inner.dataset.originalHtml) return;
    inner.innerHTML = inner.dataset.originalHtml;
    inner.style.overflow = "";
    inner.style.whiteSpace = "";
    inner.dataset.marquee = "false";
    if (inner._pause && inner._resume) {
      var bar = inner.closest(".announcement-bar");
      if (bar) {
        bar.removeEventListener("mouseenter", inner._pause);
        bar.removeEventListener("mouseleave", inner._resume);
      }
    }
  }
  function makeMarquee(bar) {
    console.log("[announcement] checking bar for marquee");
    var inner = bar.querySelector(".announcement-bar-inner");
    if (!inner) return;
    if (!inner.dataset.originalHtml)
      inner.dataset.originalHtml = inner.innerHTML;
    var contentEl = firstChildElement(inner);
    if (!contentEl) return;
    inner.style.overflow = "hidden";
    inner.style.whiteSpace = "nowrap";
    var needsMarquee = contentEl.scrollWidth > inner.clientWidth;
    console.log("[announcement] overflow:", needsMarquee);
    if (!needsMarquee) {
      if (inner.dataset.marquee === "true") restore(inner);
      return;
    }
    if (inner.dataset.marquee === "true") return;
    injectStyles();
    var viewport = document.createElement("div");
    viewport.className = "announcement-marquee-viewport";
    var track = document.createElement("div");
    track.className = "announcement-marquee-track";
    var seg1 = document.createElement("div");
    seg1.className = "announcement-marquee-segment";
    seg1.innerHTML = contentEl.outerHTML;
    var seg2 = document.createElement("div");
    seg2.className = "announcement-marquee-segment";
    seg2.innerHTML = contentEl.outerHTML;
    track.appendChild(seg1);
    track.appendChild(seg2);
    viewport.appendChild(track);
    inner.innerHTML = "";
    inner.appendChild(viewport);
    var measure = seg1.getBoundingClientRect().width;
    var speed = 80;
    var duration = Math.max(6, measure / speed);
    track.style.animationDuration = duration + "s";
    inner.dataset.marquee = "true";
    function pause() {
      track.style.animationPlayState = "paused";
    }
    function resume() {
      track.style.animationPlayState = "running";
    }
    bar.addEventListener("mouseenter", pause);
    bar.addEventListener("mouseleave", resume);
    inner._pause = pause;
    inner._resume = resume;
    console.log("[announcement] marquee applied, duration:", duration);
  }
  function run() {
    console.log("[announcement] run triggered");
    document.querySelectorAll(".announcement-bar").forEach(makeMarquee);
  }
  var ro;
  onReady(function () {
    run();
    var ticking = false;
    window.addEventListener(
      "resize",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          console.log("[announcement] resize detected");
          document
            .querySelectorAll(".announcement-bar-inner")
            .forEach(function (inner) {
              if (inner.dataset.marquee === "true") restore(inner);
            });
          run();
          ticking = false;
        });
      },
      { passive: true }
    );
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(function () {
        console.log("[announcement] ResizeObserver triggered");
        document
          .querySelectorAll(".announcement-bar-inner")
          .forEach(function (inner) {
            if (inner.dataset.marquee === "true") restore(inner);
          });
        run();
      });
      document
        .querySelectorAll(".announcement-bar-inner")
        .forEach(function (el) {
          ro.observe(el);
        });
    }
  });
})();
