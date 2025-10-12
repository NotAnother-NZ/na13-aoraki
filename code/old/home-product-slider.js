document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector("#discover-product-slider-list");
  if (!list) return;

  const firstItem = list.querySelector(
    ".discover-product-slider-list-item:first-child"
  );
  const lastItem = list.querySelector(
    ".discover-product-slider-list-item:last-child"
  );
  const btnNext = document.querySelector("#discover-product-slider-next");
  const btnPrev = document.querySelector("#discover-product-slider-prev");
  const scrollTrack = document.querySelector(".slider-scroll");
  const scrollBar = scrollTrack
    ? scrollTrack.querySelector(".slider-scroll-bar")
    : null;

  if (btnNext) {
    btnNext.style.opacity = "0";
    btnNext.style.visibility = "hidden";
    btnNext.style.transition = "opacity 0.25s ease, visibility 0.25s ease";
  }
  if (btnPrev) {
    btnPrev.style.opacity = "0";
    btnPrev.style.visibility = "hidden";
    btnPrev.style.transition = "opacity 0.25s ease, visibility 0.25s ease";
  }

  function fade(el, show) {
    if (!el) return;
    if (show) {
      el.style.opacity = "1";
      el.style.visibility = "visible";
    } else {
      el.style.opacity = "0";
      el.style.visibility = "hidden";
    }
  }

  function pickVisibleMarginRef() {
    const candidates = document.querySelectorAll(
      '[data-margin-left="discover-product-slider"]'
    );
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      const visible =
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        el.getClientRects().length > 0;
      if (visible) return el;
    }
    return null;
  }

  function updateMargins() {
    if (!firstItem || !lastItem) return;
    const marginRef = pickVisibleMarginRef();
    if (!marginRef) return;
    const leftRect = marginRef.getBoundingClientRect();
    const leftMargin = Math.max(0, leftRect.left);
    firstItem.style.marginLeft = `${leftMargin}px`;
    lastItem.style.marginRight = `${leftMargin}px`;
  }

  function updateScrollbar() {
    if (!scrollTrack || !scrollBar) return;
    const total = list.scrollWidth;
    const visible = list.clientWidth;
    const items = list.querySelectorAll(
      ".discover-product-slider-list-item"
    ).length;
    if (total <= visible || items === 0) {
      scrollTrack.style.display = "none";
      return;
    }
    scrollTrack.style.display = "";
    const trackWidth = scrollTrack.clientWidth;
    const avgItemWidth = total / items;
    const visibleItems = Math.max(1, Math.round(visible / avgItemWidth));
    const barWidth = Math.max(8, (visibleItems / items) * trackWidth);
    const maxS = Math.max(1, total - visible);
    const maxX = Math.max(0, trackWidth - barWidth);
    const progress = Math.min(1, Math.max(0, list.scrollLeft / maxS));
    const x = maxX * progress;
    scrollBar.style.width = `${barWidth}px`;
    scrollBar.style.transform = `translateX(${x}px)`;
  }

  function maxScroll() {
    return Math.max(0, list.scrollWidth - list.clientWidth);
  }

  function updateButtons() {
    const total = list.scrollWidth;
    const visible = list.clientWidth;
    const scrollable = total > visible + 1;
    if (!scrollable) {
      fade(btnPrev, false);
      fade(btnNext, false);
      return;
    }
    const m = maxScroll();
    const atStart = list.scrollLeft <= 1;
    const atEnd = list.scrollLeft >= m - 1;
    fade(btnPrev, !atStart);
    fade(btnNext, !atEnd);
  }

  function rafUpdate() {
    updateMargins();
    updateScrollbar();
    updateButtons();
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const clamped = Math.min(Math.max(list.scrollLeft, 0), maxScroll());
      if (clamped !== list.scrollLeft) list.scrollLeft = clamped;
      updateScrollbar();
      updateButtons();
      ticking = false;
    });
  }

  function itemStepWidth() {
    const item = list.querySelector(".discover-product-slider-list-item");
    if (!item) return Math.max(1, Math.floor(list.clientWidth * 0.9));
    const cs = getComputedStyle(item);
    const w = item.getBoundingClientRect().width;
    const mr = parseFloat(cs.marginRight) || 0;
    return Math.max(1, Math.round(w + mr));
  }

  function scrollByItems(n) {
    const step = itemStepWidth();
    const target =
      n > 0 ? list.scrollLeft + step * n : list.scrollLeft - step * Math.abs(n);
    const clamped = Math.min(Math.max(target, 0), maxScroll());
    list.scrollTo({ left: clamped, behavior: "smooth" });
  }

  if (btnPrev) btnPrev.addEventListener("click", () => scrollByItems(-1));
  if (btnNext) btnNext.addEventListener("click", () => scrollByItems(1));

  let dragging = false;
  let maybeDrag = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let inertiaId = 0;
  const DRAG_THRESHOLD = 6;
  let didDrag = false;

  function clampScrollLeft(x) {
    return Math.min(Math.max(x, 0), maxScroll());
  }

  function stopInertia() {
    if (inertiaId) {
      cancelAnimationFrame(inertiaId);
      inertiaId = 0;
    }
  }

  function startDrag(e) {
    if (dragging) return;
    dragging = true;
    didDrag = true;
    list.setPointerCapture(e.pointerId);
    list.classList.add("is-dragging");
    stopInertia();
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
  }

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    list.classList.remove("is-dragging");
    if (e && e.pointerId != null) list.releasePointerCapture(e.pointerId);
    const decay = 0.92;
    const minVel = 0.2;
    function step() {
      const next = clampScrollLeft(list.scrollLeft + velocity);
      list.scrollLeft = next;
      velocity *= decay;
      const atEdge = next <= 0 || next >= maxScroll();
      if (Math.abs(velocity) < minVel || atEdge) {
        inertiaId = 0;
        return;
      }
      inertiaId = requestAnimationFrame(step);
    }
    if (Math.abs(velocity) >= minVel) inertiaId = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    maybeDrag = true;
    dragging = false;
    didDrag = false;
    startX = e.clientX;
    startScroll = list.scrollLeft;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
  }

  function onPointerMove(e) {
    if (!maybeDrag && !dragging) return;
    const dxFromStart = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dxFromStart) >= DRAG_THRESHOLD) {
        startDrag(e);
      } else {
        return;
      }
    }
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(1, now - lastT);
    list.scrollLeft = clampScrollLeft(startScroll - (e.clientX - startX));
    velocity = -(dx / dt) * 16;
    lastX = e.clientX;
    lastT = now;
  }

  function onPointerUp(e) {
    if (dragging) endDrag(e);
    maybeDrag = false;
    setTimeout(() => {
      didDrag = false;
    }, 0);
  }

  function onPointerCancel() {
    if (dragging) {
      dragging = false;
      list.classList.remove("is-dragging");
      stopInertia();
    }
    maybeDrag = false;
    setTimeout(() => {
      didDrag = false;
    }, 0);
  }

  function trackMetrics() {
    const trackWidth = scrollTrack.clientWidth;
    const barWidth = scrollBar.getBoundingClientRect().width;
    const maxX = Math.max(0, trackWidth - barWidth);
    const m = Math.max(1, maxScroll());
    return { trackWidth, barWidth, maxX, m };
  }

  function setScrollFromTrackX(x) {
    const { maxX, m } = trackMetrics();
    const nx = Math.min(Math.max(x, 0), maxX);
    const progress = maxX === 0 ? 0 : nx / maxX;
    const target = progress * m;
    list.scrollLeft = target;
    updateScrollbar();
    updateButtons();
  }

  let draggingBar = false;
  let barOffsetX = 0;

  function onBarPointerDown(e) {
    if (!scrollTrack || !scrollBar) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    scrollBar.setPointerCapture(e.pointerId);
    draggingBar = true;
    scrollBar.style.cursor = "grabbing";
    const barRect = scrollBar.getBoundingClientRect();
    barOffsetX = e.clientX - barRect.left;
  }

  function onBarPointerMove(e) {
    if (!draggingBar) return;
    const trackRect = scrollTrack.getBoundingClientRect();
    const x = e.clientX - trackRect.left - barOffsetX;
    setScrollFromTrackX(x);
  }

  function onBarPointerUp(e) {
    if (!draggingBar) return;
    draggingBar = false;
    scrollBar.style.cursor = "grab";
    scrollBar.releasePointerCapture(e.pointerId);
  }

  function onTrackPointerDown(e) {
    if (!scrollTrack || !scrollBar) return;
    if (e.target === scrollBar) return;
    const rect = scrollTrack.getBoundingClientRect();
    const barWidth = scrollBar.getBoundingClientRect().width;
    const x = e.clientX - rect.left - barWidth / 2;
    setScrollFromTrackX(x);
  }

  if (scrollTrack) scrollTrack.style.userSelect = "none";
  if (scrollBar) {
    scrollBar.style.touchAction = "none";
    scrollBar.style.cursor = "grab";
    scrollBar.addEventListener("pointerdown", onBarPointerDown);
    scrollBar.addEventListener("pointermove", onBarPointerMove);
    scrollBar.addEventListener("pointerup", onBarPointerUp);
    scrollBar.addEventListener("pointercancel", onBarPointerUp);
    scrollBar.addEventListener("pointerleave", onBarPointerUp);
  }
  if (scrollTrack) {
    scrollTrack.style.cursor = "pointer";
    scrollTrack.addEventListener("pointerdown", onTrackPointerDown);
  }

  let hoverBindings = [];
  function clearHover() {
    hoverBindings.forEach(({ el, type, fn }) =>
      el.removeEventListener(type, fn)
    );
    hoverBindings = [];
    const items = list.querySelectorAll(".discover-product-slider-list-item");
    items.forEach((item) => {
      const primary = item.querySelector(".discover-product-media:not(.hover)");
      const hovers = item.querySelectorAll(".discover-product-media.hover");
      if (primary) {
        primary.style.transition = "";
        primary.style.opacity = "1";
        primary.style.transform = "scale(1)";
      }
      if (hovers.length) {
        hovers.forEach((h) => {
          h.style.transition = "";
          h.style.opacity = "0";
          h.style.transform = "scale(1)";
        });
      }
    });
  }

  function setupHover() {
    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    clearHover();
    if (!canHover) return;
    const items = list.querySelectorAll(".discover-product-slider-list-item");
    items.forEach((item) => {
      const primary = item.querySelector(".discover-product-media:not(.hover)");
      const hovers = item.querySelectorAll(".discover-product-media.hover");
      if (!primary && !hovers.length) return;
      if (primary) {
        primary.style.transition =
          "opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1)";
        primary.style.opacity = "1";
        primary.style.transform = "scale(1)";
        primary.style.pointerEvents = "none";
      }
      if (hovers.length) {
        hovers.forEach((h) => {
          h.style.transition =
            "opacity 380ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)";
          h.style.opacity = "0";
          h.style.transform = "scale(1)";
          h.style.pointerEvents = "none";
        });
      }
      const showHover = () => {
        if (hovers.length) {
          if (primary) {
            primary.style.opacity = "0";
            primary.style.transform = "scale(0.985)";
          }
          hovers.forEach((h) => {
            h.style.opacity = "1";
            h.style.transform = "scale(1.12)";
          });
        } else if (primary) {
          primary.style.opacity = "1";
          primary.style.transform = "scale(1.08)";
        }
      };
      const hideHover = () => {
        if (hovers.length) {
          hovers.forEach((h) => {
            h.style.opacity = "0";
            h.style.transform = "scale(1)";
          });
          if (primary) {
            primary.style.opacity = "1";
            primary.style.transform = "scale(1)";
          }
        } else if (primary) {
          primary.style.transform = "scale(1)";
        }
      };
      const bind = (el, type, fn) => {
        el.addEventListener(type, fn);
        hoverBindings.push({ el, type, fn });
      };
      bind(item, "mouseenter", showHover);
      bind(item, "mouseleave", hideHover);
      bind(item, "focusin", showHover);
      bind(item, "focusout", hideHover);
    });
  }

  const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
  const onMQ = () => setupHover();
  if (mq.addEventListener) mq.addEventListener("change", onMQ);
  else if (mq.addListener) mq.addListener(onMQ);

  const ro =
    "ResizeObserver" in window
      ? new ResizeObserver(() => {
          rafUpdate();
          setupHover();
        })
      : null;
  if (ro) {
    ro.observe(list);
    if (scrollTrack) ro.observe(scrollTrack);
  }

  Array.from(list.querySelectorAll("img")).forEach((img) => {
    if (img.complete) return;
    img.addEventListener(
      "load",
      () => {
        rafUpdate();
        setupHover();
      },
      { once: true }
    );
    img.addEventListener(
      "error",
      () => {
        rafUpdate();
        setupHover();
      },
      { once: true }
    );
  });

  list.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    stopInertia();
    rafUpdate();
    setupHover();
  });

  list.addEventListener("pointerdown", onPointerDown);
  list.addEventListener("pointermove", onPointerMove);
  list.addEventListener("pointerup", onPointerUp);
  list.addEventListener("pointercancel", onPointerCancel);
  list.addEventListener("pointerleave", onPointerCancel);

  list.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (didDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  rafUpdate();
  setupHover();
});
