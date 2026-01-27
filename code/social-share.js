(function () {
  var BTN_ATTR = "data-rt-social-share-button";
  var TIP_ATTR = "data-rt-share-tooltip";
  var TITLE_ATTR = "data-rt-social-share-title";
  var URL_ATTR = "data-rt-social-share-url";
  if (!document.querySelector("[" + BTN_ATTR + "]")) return;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = function () {
        rej(new Error("load-failed:" + src));
      };
      document.head.appendChild(s);
    });
  }

  function openPopup(u) {
    var w = 600,
      h = 600;
    var y =
      (window.top.outerHeight || window.innerHeight) / 2 +
      (window.top.screenY || 0) -
      h / 2;
    var x =
      (window.top.outerWidth || window.innerWidth) / 2 +
      (window.top.screenX || 0) -
      w / 2;
    var win = window.open(
      u,
      "_blank",
      "popup=yes,toolbar=0,location=0,status=0,menubar=0,scrollbars=1,resizable=1,width=" +
        w +
        ",height=" +
        h +
        ",top=" +
        Math.max(0, y) +
        ",left=" +
        Math.max(0, x)
    );
    if (!win) window.location.href = u;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        document.body.removeChild(ta);
      });
    } else {
      return new Promise(function (resolve) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        document.body.removeChild(ta);
        resolve();
      });
    }
  }

  function readAttrChain(primaryEl, attr, fallbacks) {
    if (primaryEl && primaryEl.hasAttribute(attr))
      return primaryEl.getAttribute(attr);
    for (var i = 0; i < fallbacks.length; i++) {
      var el = fallbacks[i];
      if (el && el.hasAttribute && el.hasAttribute(attr))
        return el.getAttribute(attr);
    }
    return "";
  }

  function getTipForKey(key) {
    return document.querySelector(
      "[" + TIP_ATTR + '="' + CSS.escape(key) + '"]'
    );
  }

  function getShareMeta(linkEl) {
    var tip = null;
    var btn = null;
    var key = "";
    var cur = linkEl;
    while (cur && cur !== document.body) {
      if (!key && cur.hasAttribute && cur.hasAttribute(TIP_ATTR))
        key = cur.getAttribute(TIP_ATTR);
      cur = cur.parentNode;
    }
    if (key) tip = getTipForKey(key);
    if (key)
      btn = document.querySelector(
        "[" + BTN_ATTR + '="' + CSS.escape(key) + '"]'
      );
    var url =
      readAttrChain(linkEl, URL_ATTR, [tip, btn]) || window.location.href;
    var title =
      readAttrChain(linkEl, TITLE_ATTR, [tip, btn]) || document.title || "";
    return { url: url, title: title, tip: tip, btn: btn };
  }

  function wireShareLinks(tip) {
    var links = [].slice.call(
      tip.querySelectorAll("[data-rt-social-share-link]")
    );
    links.forEach(function (a) {
      if (a.__rtShareWired) return;
      a.__rtShareWired = true;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var kind = a.getAttribute("data-rt-social-share-link") || "";
        var meta = getShareMeta(a);
        var shareUrl = "";
        if (kind === "facebook") {
          shareUrl =
            "https://www.facebook.com/sharer/sharer.php?u=" +
            encodeURIComponent(meta.url);
          openPopup(shareUrl);
        } else if (kind === "twitter-x") {
          shareUrl =
            "https://twitter.com/intent/tweet?url=" +
            encodeURIComponent(meta.url) +
            "&text=" +
            encodeURIComponent(meta.title);
          openPopup(shareUrl);
        } else if (kind === "copy-link") {
          copyToClipboard(meta.url);
        } else if (kind === "native-web-share") {
          if (navigator.share) {
            navigator
              .share({ title: meta.title, text: meta.title, url: meta.url })
              .catch(function () {});
          } else {
            copyToClipboard(meta.url);
          }
        }
      });
    });
  }

  function initDesktop() {
    var btns = [].slice.call(document.querySelectorAll("[" + BTN_ATTR + "]"));
    var tips = [].slice.call(document.querySelectorAll("[" + TIP_ATTR + "]"));
    tips.forEach(function (t) {
      if (!t.hasAttribute("hidden")) t.setAttribute("hidden", "");
      wireShareLinks(t);
    });
    btns.forEach(function (btn) {
      var key = btn.getAttribute(BTN_ATTR) || "";
      if (!key.trim()) return;
      var tip = getTipForKey(key);
      if (!tip) return;
      tippy(btn, {
        content: tip,
        allowHTML: true,
        interactive: true,
        placement: "top",
        trigger: "mouseenter focus",
        appendTo: document.body,
        hideOnClick: true,
        offset: [0, 8],
        onShow: function () {
          tip.removeAttribute("hidden");
          wireShareLinks(tip);
        },
        onHide: function () {
          tip.setAttribute("hidden", "");
        },
        onMount: function (instance) {
          var pop = instance.popper;
          pop.style.background = "transparent";
          var box = pop.querySelector(".tippy-box");
          if (box) box.style.background = "transparent";
        },
      });
    });
  }

  function removeCorrespondingTooltips() {
    var btns = [].slice.call(document.querySelectorAll("[" + BTN_ATTR + "]"));
    btns.forEach(function (btn) {
      var key = btn.getAttribute(BTN_ATTR) || "";
      if (!key.trim()) return;
      var tip = getTipForKey(key);
      if (!tip) return;
      tip.setAttribute("hidden", "");
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    });
  }

  function initMobileTouch() {
    removeCorrespondingTooltips();
    var btns = [].slice.call(document.querySelectorAll("[" + BTN_ATTR + "]"));
    btns.forEach(function (btn) {
      if (btn.__rtNativeWired) return;
      btn.__rtNativeWired = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var title = btn.getAttribute(TITLE_ATTR) || document.title || "";
        var url = btn.getAttribute(URL_ATTR) || window.location.href;
        if (navigator.share) {
          navigator
            .share({ title: title, text: title, url: url })
            .catch(function () {});
        } else {
          copyToClipboard(url);
        }
      });
    });
  }

  var isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;
  var isTabletOrMobile = window.matchMedia("(max-width: 991px)").matches;

  if (isTouch || isTabletOrMobile) {
    initMobileTouch();
  } else {
    loadScript("https://unpkg.com/@popperjs/core@2")
      .then(function () {
        return loadScript(
          "https://unpkg.com/tippy.js@6/dist/tippy-bundle.umd.min.js"
        );
      })
      .then(initDesktop)
      .catch(function () {});
  }
})();
