(function () {
  var ROOT_ID = "package-gallery";
  var LIST_ID = "package-gallery-list";
  var PREV_ID = "package-gallery-slider-prev";
  var NEXT_ID = "package-gallery-slider-next";
  var ZOOM_BTN_ID = "zoom-button";
  var FLAG = "__pkgSwiperInit__";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function loadAsset(t, attrs) {
    return new Promise(function (res, rej) {
      var el = document.createElement(t);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      el.onload = res;
      el.onerror = rej;
      document.head.appendChild(el);
    });
  }
  function ensureSwiper() {
    var hasCSS = !!document.querySelector(
      'link[href*="swiper-bundle.min.css"]'
    );
    var hasJS = !!window.Swiper;
    var tasks = [];
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
    return Promise.all(tasks);
  }

  function injectCSS() {
    if (document.querySelector("[data-pkg-style]")) return;
    var css =
      "" +
      "[data-pkg-swiper]{width:100%;height:100%}" +
      "[data-pkg-swiper] .swiper-wrapper{width:100%;height:100%}" +
      "[data-pkg-swiper] .swiper-slide{width:100%;height:100%;box-sizing:border-box;display:grid;place-items:center}" +
      "[data-pkg-swiper] .package-gallery-list-item{margin:0;padding:0}" +
      "[data-pkg-swiper] img{display:block;width:100%;height:100%;object-fit:cover}" +
      "[data-lightbox]{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:2147483647;opacity:0;transition:opacity .3s ease;background:rgba(0,0,0,.82);backdrop-filter:saturate(1.1) blur(2px)}" +
      "@media (prefers-reduced-motion:reduce){[data-lightbox]{transition:none}}" +
      "[data-lightbox].open{display:flex}" +
      "[data-lightbox].in{opacity:1}" +
      "[data-lightbox-wrap]{position:relative;max-width:92vw;height:100dvh;display:flex;gap:16px;align-items:center;justify-content:center}" +
      "[data-stage]{position:relative;flex:1 1 auto;max-width:calc(92vw - 136px);height:100dvh;display:flex;align-items:center;justify-content:center}" +
      "[data-lightbox-img]{display:block;max-width:100%;height:100%;object-fit:contain;pointer-events:auto;opacity:0;transform:translateZ(0) scale(.985);transition:opacity .35s ease,transform .45s cubic-bezier(0.19,1,0.22,1)}" +
      "[data-lightbox].in [data-lightbox-img].ready{opacity:1;transform:translateZ(0) scale(1)}" +
      "[data-rail]{flex:0 0 120px;height:100dvh;display:flex;flex-direction:column;gap:10px;overflow:auto;padding:12px 8px;background:rgba(0,0,0,.18);border-left:1px solid rgba(255,255,255,.06)}" +
      "[data-thumb]{all:unset;display:block;width:100%;aspect-ratio:1/1;position:relative;cursor:pointer;border-radius:10px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);opacity:.8;transition:opacity .2s ease,box-shadow .2s ease,transform .15s ease}" +
      "[data-thumb]:hover{opacity:1;transform:translateY(-1px)}" +
      "[data-thumb].active{opacity:1;box-shadow:inset 0 0 0 2px #fff}" +
      "[data-thumb] img{width:100%;height:100%;object-fit:cover;display:block}" +
      "[data-close]{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:9999px;display:flex;align-items:center;justify-content:center;z-index:4;background:rgba(0,0,0,.35);color:#fff;opacity:.95;transition:opacity .2s ease}" +
      "[data-close]:hover{opacity:1}" +
      "[data-magnifier]{position:fixed;left:0;top:0;width:0;height:0;border-radius:9999px;pointer-events:none;z-index:2147483647;box-shadow:0 0 0 1px rgba(255,255,255,.25) inset;opacity:0;transition:opacity .25s ease}" +
      "@media (hover:hover){[data-pkg-swiper]{cursor:grab}[data-pkg-swiper].is-grabbing{cursor:grabbing}}" +
      "@media (max-width:991px){[data-rail]{display:none}[data-stage]{max-width:92vw}}" +
      "@media (max-width:991px), (hover:none){#" +
      ZOOM_BTN_ID +
      "{display:none !important}}";
    var s = document.createElement("style");
    s.type = "text/css";
    s.setAttribute("data-pkg-style", "");
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  function makeSwiperStructure() {
    var list = document.getElementById(LIST_ID);
    if (!list) return null;
    var items = list.querySelectorAll(".package-gallery-list-item");
    if (!items.length) return null;
    var container = document.createElement("div");
    container.className = "swiper";
    container.setAttribute("data-pkg-swiper", "");
    var wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper";
    items.forEach(function (item) {
      item.classList.add("swiper-slide");
      var img = item.querySelector("img");
      if (img) {
        img.removeAttribute("width");
        img.removeAttribute("height");
      }
      wrapper.appendChild(item);
    });
    container.appendChild(wrapper);
    list.replaceWith(container);
    return container;
  }

  function initResizeHandling(target, swiper) {
    var rafId = null;
    function upd() {
      rafId = null;
      if (swiper) {
        swiper.updateSize();
        swiper.updateSlides();
        swiper.updateProgress();
        swiper.updateAutoHeight(0);
      }
    }
    function sched() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(upd);
    }
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(sched);
      ro.observe(target);
    } else {
      window.addEventListener("resize", sched, { passive: true });
    }
    sched();
  }

  function createIcon(pathD) {
    var s = 24;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", s);
    svg.setAttribute("height", s);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", pathD);
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.8");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  }

  function createLightbox() {
    var overlay = document.createElement("div");
    overlay.setAttribute("data-lightbox", "");
    var wrap = document.createElement("div");
    wrap.setAttribute("data-lightbox-wrap", "");
    var stage = document.createElement("div");
    stage.setAttribute("data-stage", "");
    var img = document.createElement("img");
    img.setAttribute("data-lightbox-img", "");
    stage.appendChild(img);
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("data-close", "");
    close.appendChild(createIcon("M6 6l12 12M18 6L6 18"));
    var lens = document.createElement("div");
    lens.setAttribute("data-magnifier", "");
    var rail = document.createElement("div");
    rail.setAttribute("data-rail", "");
    wrap.appendChild(stage);
    overlay.appendChild(close);
    overlay.appendChild(lens);
    overlay.appendChild(rail);
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    return {
      overlay: overlay,
      wrap: wrap,
      stage: stage,
      img: img,
      lens: lens,
      closeBtn: close,
      rail: rail,
    };
  }

  function Magnifier(lensEl) {
    this.el = lensEl;
    this.size = 220;
    this.bgW = 0;
    this.bgH = 0;
    this.rect = null;
    this.pos = { x: 0, y: 0 };
    this.scale = 1.06;
    this.deepScale = 1.35;
    this.useDeep = false;
    this.raf = null;
    this.active = false;
    this.hovering = false;
  }
  Magnifier.prototype.setImage = function (src, nw, nh, rect) {
    this.rect = rect;
    this.bgW = Math.floor(nw * this.scale);
    this.bgH = Math.floor(nh * this.scale);
    this.el.style.width = this.size + "px";
    this.el.style.height = this.size + "px";
    this.el.style.background =
      'url("' + src.replace(/"/g, '\\"') + '") no-repeat';
    this.el.style.backgroundSize = this.bgW + "px " + this.bgH + "px";
  };
  Magnifier.prototype.toggleDeep = function (nw, nh) {
    this.useDeep = !this.useDeep;
    var s = this.useDeep ? this.deepScale : this.scale;
    this.bgW = Math.floor(nw * s);
    this.bgH = Math.floor(nh * s);
    this.el.style.backgroundSize = this.bgW + "px " + this.bgH + "px";
  };
  Magnifier.prototype.onEnter = function () {
    this.hovering = true;
    if (this.active) this.el.style.opacity = "1";
  };
  Magnifier.prototype.onLeave = function () {
    this.hovering = false;
    this.el.style.opacity = "0";
  };
  Magnifier.prototype.updatePos = function (x, y) {
    this.pos.x = x;
    this.pos.y = y;
    if (this.raf) return;
    var self = this;
    this.raf = requestAnimationFrame(function () {
      self.tick();
    });
  };
  Magnifier.prototype.tick = function () {
    this.raf = null;
    if (!this.active || !this.rect) return;
    var L = this.size;
    var rx = this.pos.x - this.rect.left;
    var ry = this.pos.y - this.rect.top;
    if (rx < 0 || ry < 0 || rx > this.rect.width || ry > this.rect.height) {
      this.onLeave();
      return;
    }
    var sx = this.bgW / this.rect.width;
    var sy = this.bgH / this.rect.height;
    var bx = -(rx * sx - L / 2);
    var by = -(ry * sy - L / 2);
    this.el.style.transform =
      "translate(" +
      (this.pos.x - L / 2) +
      "px," +
      (this.pos.y - L / 2) +
      "px)";
    this.el.style.backgroundPosition = bx + "px " + by + "px";
  };
  Magnifier.prototype.show = function () {
    this.active = true;
    if (this.hovering) this.el.style.opacity = "1";
  };
  Magnifier.prototype.hide = function () {
    this.active = false;
    this.el.style.opacity = "0";
  };

  function lockScroll(lock) {
    var b = document.documentElement;
    if (lock) {
      if (!b.dataset.__pkgScroll) {
        b.dataset.__pkgScroll = String(window.scrollY);
      }
      b.style.top = "-" + b.dataset.__pkgScroll + "px";
      b.style.position = "fixed";
      b.style.width = "100%";
    } else {
      var y = parseInt(b.dataset.__pkgScroll || "0", 10) || 0;
      b.style.position = "";
      b.style.top = "";
      b.style.width = "";
      window.scrollTo(0, y);
      delete b.dataset.__pkgScroll;
    }
  }

  function LightboxController(swiper) {
    this.lb = createLightbox();
    this.mag = new Magnifier(this.lb.lens);
    this.index = 0;
    this.urls = [];
    this.dim = [];
    this.cache = {};
    this.opened = false;
    this.thumbs = [];
    this.bindUI(swiper);
  }
  LightboxController.prototype.bindUI = function (swiper) {
    var self = this;
    function updateRect() {
      self.mag.rect = self.lb.img.getBoundingClientRect();
    }
    function onMove(e) {
      self.mag.updatePos(e.clientX, e.clientY);
    }
    function onTouch(e) {
      if (e.touches && e.touches.length) {
        self.mag.updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
    this.lb.overlay.addEventListener("click", function (e) {
      if (e.target === self.lb.overlay) self.close();
    });
    this.lb.closeBtn.addEventListener("click", function () {
      self.close();
    });
    this.lb.wrap.addEventListener("click", function (e) {
      if (e.target === self.lb.wrap) self.close();
    });
    this.lb.img.addEventListener("mouseenter", function () {
      self.mag.onEnter();
    });
    this.lb.img.addEventListener("mouseleave", function () {
      self.mag.onLeave();
    });
    this.lb.img.addEventListener("click", function (e) {
      e.stopPropagation();
      self.mag.toggleDeep(self.dim[self.index].w, self.dim[self.index].h);
    });
    this.lb.overlay.addEventListener("mousemove", onMove, { passive: true });
    this.lb.overlay.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener(
      "resize",
      function () {
        if (self.opened) updateRect();
      },
      { passive: true }
    );
    document.addEventListener("keydown", function (e) {
      if (!self.opened) return;
      if (e.key === "Escape") self.close();
    });
  };
  LightboxController.prototype.setData = function (urls) {
    var self = this;
    this.urls = urls;
    this.dim = new Array(urls.length);
    this.lb.rail.innerHTML = "";
    this.thumbs = urls.map((u, i) => {
      var b = document.createElement("button");
      b.setAttribute("data-thumb", "");
      b.type = "button";
      var im = document.createElement("img");
      im.alt = "";
      im.loading = "lazy";
      im.src = u;
      b.appendChild(im);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        self.goTo(i);
      });
      this.lb.rail.appendChild(b);
      return b;
    });
    var promises = urls.map(function (u) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.decoding = "async";
        img.onload = function () {
          self.cache[u] = img;
          self.dim[self.urls.indexOf(u)] = {
            w: img.naturalWidth,
            h: img.naturalHeight,
          };
          resolve();
        };
        img.src = u;
      });
    });
    Promise.all(promises).then(function () {});
  };
  LightboxController.prototype.markActive = function (i) {
    this.thumbs.forEach(function (b, idx) {
      if (idx === i) b.classList.add("active");
      else b.classList.remove("active");
    });
    var active = this.thumbs[i];
    if (active && this.lb.rail) {
      var r = this.lb.rail;
      var br = active.getBoundingClientRect();
      var rr = r.getBoundingClientRect();
      if (br.top < rr.top) r.scrollTop += br.top - rr.top - 8;
      else if (br.bottom > rr.bottom) r.scrollTop += br.bottom - rr.bottom + 8;
    }
  };
  LightboxController.prototype.openAt = function (index) {
    this.index = index;
    this.opened = true;
    this.lb.overlay.classList.add("open");
    this.lb.overlay.offsetHeight;
    lockScroll(true);
    this.lb.overlay.classList.add("in");
    this.showImage(index, true);
  };
  LightboxController.prototype.close = function () {
    var self = this;
    if (!this.opened) return;
    this.opened = false;
    this.mag.hide();
    this.lb.overlay.classList.remove("in");
    setTimeout(function () {
      self.lb.overlay.classList.remove("open");
      lockScroll(false);
    }, 300);
  };
  LightboxController.prototype.showImage = function (i, animate) {
    var url = this.urls[i];
    this.markActive(i);
    var cached = this.cache[url];
    if (cached && cached.complete) {
      this.lb.img.classList.remove("ready");
      var self = this;
      requestAnimationFrame(function () {
        self.lb.img.src = cached.src;
        self.lb.img.decode
          ? self.lb.img
              .decode()
              .then(function () {
                self._afterShow(i);
              })
              .catch(function () {
                self._afterShow(i);
              })
          : (self.lb.img.onload = function () {
              self._afterShow(i);
            });
      });
      this.preloadNeighbors(i);
    } else {
      var self = this;
      var temp = new Image();
      temp.onload = function () {
        self.cache[url] = temp;
        self.dim[i] = { w: temp.naturalWidth, h: temp.naturalHeight };
        self.lb.img.classList.remove("ready");
        requestAnimationFrame(function () {
          self.lb.img.src = temp.src;
          self.lb.img.decode
            ? self.lb.img
                .decode()
                .then(function () {
                  self._afterShow(i);
                })
                .catch(function () {
                  self._afterShow(i);
                })
            : (self.lb.img.onload = function () {
                self._afterShow(i);
              });
        });
        self.preloadNeighbors(i);
      };
      temp.src = url;
    }
  };
  LightboxController.prototype._afterShow = function (i) {
    this.lb.img.classList.add("ready");
    var d = this.dim[i];
    this.mag.useDeep = false;
    this.mag.setImage(
      this.urls[i],
      d.w,
      d.h,
      this.lb.img.getBoundingClientRect()
    );
    this.mag.show();
  };
  LightboxController.prototype.preloadNeighbors = function (i) {
    var left = (i - 1 + this.urls.length) % this.urls.length;
    var right = (i + 1) % this.urls.length;
    var lurl = this.urls[left],
      rurl = this.urls[right];
    if (!this.cache[lurl]) {
      var li = new Image();
      li.src = lurl;
      this.cache[lurl] = li;
    }
    if (!this.cache[rurl]) {
      var ri = new Image();
      ri.src = rurl;
      this.cache[rurl] = ri;
    }
  };
  LightboxController.prototype.goTo = function (i) {
    this.index = i;
    this.showImage(i, false);
  };

  function initZoomAndLightbox(swiper) {
    var btn = document.getElementById(ZOOM_BTN_ID);
    var slides = Array.from(swiper.slides || []);
    var urls = slides
      .map(function (sl) {
        var im = sl.querySelector("img");
        return im ? im.currentSrc || im.src : "";
      })
      .filter(Boolean);
    var lb = new LightboxController(swiper);
    lb.setData(urls);
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        lb.openAt(swiper.activeIndex);
      });
    }
  }

  function initGrabbing(container) {
    function down(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      container.classList.add("is-grabbing");
    }
    function up() {
      container.classList.remove("is-grabbing");
    }
    container.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    container.addEventListener("pointercancel", up, { passive: true });
    container.addEventListener("pointerleave", up, { passive: true });
  }

  function initSwiper(container) {
    var prev = document.getElementById(PREV_ID);
    var next = document.getElementById(NEXT_ID);
    var s = new Swiper(container, {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: false,
      speed: 450,
      allowTouchMove: true,
      simulateTouch: true,
      grabCursor: true,
      threshold: 5,
      navigation: { prevEl: prev || undefined, nextEl: next || undefined },
    });
    if (prev) {
      prev.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
    if (next) {
      next.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
    initGrabbing(container);
    var root = document.getElementById(ROOT_ID);
    if (root) initResizeHandling(root, s);
    return s;
  }

  onReady(function () {
    ensureSwiper().then(function () {
      injectCSS();
      var container = makeSwiperStructure();
      if (!container) return;
      var s = initSwiper(container);
      initZoomAndLightbox(s);
    });
  });
})();
