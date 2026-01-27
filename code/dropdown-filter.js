(function () {
  var ROOT = "[data-rt-dropdown]";
  if (!document.querySelector(ROOT)) return;

  var USE_NATIVE = window.matchMedia("(max-width: 991px)").matches;
  var cssHref =
    "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
  var jsSrc =
    "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";

  var currentOpenSelect = null;
  var currentOpenArrow = null;
  var RT_SILENT = false;
  var SYNCING = false;
  var WAIT_STARTED = false;
  var WAIT_MO = null;
  var WAIT_IV = null;
  var REAPPLY_IV = null;
  var LIST_MO = null;

  var PARAM_GROUPS = new Map();

  function uid() {
    return "rt_" + Math.random().toString(36).slice(2, 8);
  }

  function loadCSS(href) {
    return new Promise(function (res, rej) {
      if (
        [].some.call(document.styleSheets, function (s) {
          return s.href === href;
        })
      )
        return res();
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = function () {
        res();
      };
      l.onerror = function () {
        rej();
      };
      document.head.appendChild(l);
    });
  }
  function loadJS(src) {
    return new Promise(function (res, rej) {
      if (window.Choices) return res();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        res();
      };
      s.onerror = function () {
        rej();
      };
      document.head.appendChild(s);
    });
  }

  function norm(v) {
    return String(v == null ? "" : v)
      .trim()
      .toLowerCase();
  }
  function show(el) {
    if (!el) return;
    el.style.display = "";
  }
  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }
  function attrFromSelector(sel) {
    var m = /\[\s*([a-zA-Z0-9\-\_:]+)(?:[^\]]*)\]/.exec(sel || "");
    return m ? m[1] : "";
  }
  function valueFromNode(node, attr) {
    if (!attr) return node.textContent || "";
    var v = node.getAttribute(attr) || "";
    if (v) return v;
    if (attr.indexOf("data-") === 0 && node.dataset) {
      var k = attr.replace(/^data-/, "").replace(/-([a-z])/g, function (_, c) {
        return c.toUpperCase();
      });
      return node.dataset[k] || "";
    }
    return node.textContent || "";
  }
  function matchItem(item, typeSel, target) {
    if (!target) return true;
    var hits = item.querySelectorAll(typeSel);
    if (!hits.length) return false;
    var attr = attrFromSelector(typeSel);
    for (var i = 0; i < hits.length; i++) {
      if (norm(valueFromNode(hits[i], attr)) === norm(target)) return true;
    }
    return false;
  }
  function groupKey(trigger) {
    return (
      (trigger.getAttribute("data-rt-filter-list") || "").trim() +
      "|" +
      (trigger.getAttribute("data-rt-filter-item") || "").trim()
    );
  }

  var groups = new Map();
  function registerTrigger(trigger) {
    var key = groupKey(trigger);
    if (!groups.has(key))
      groups.set(key, {
        listSel: trigger.getAttribute("data-rt-filter-list"),
        itemSel: trigger.getAttribute("data-rt-filter-item"),
        emptySel: null,
        hideSel: null,
        triggers: new Set(),
      });
    var g = groups.get(key);
    var es = trigger.getAttribute("data-rt-filter-list-empty");
    if (es) g.emptySel = es;
    var hs = trigger.getAttribute("data-rt-filter-list-hide");
    if (hs) g.hideSel = hs;
    g.triggers.add(trigger);
  }

  function registerParamKey(trigger) {
    var k = trigger.__rtParamKey;
    if (!k) return;
    if (!PARAM_GROUPS.has(k)) PARAM_GROUPS.set(k, new Set());
    PARAM_GROUPS.get(k).add(trigger);
  }

  function applyGroup(key) {
    var g = groups.get(key);
    if (!g) return;
    var list = document.querySelector(g.listSel);
    if (!list) return;
    var items = list.querySelectorAll(g.itemSel);
    if (!items.length) return;

    var filters = [];
    g.triggers.forEach(function (t) {
      var typeSel = t.getAttribute("data-rt-filter-type");
      var val = t.__rtSelected || "";
      filters.push({ typeSel: typeSel, val: val });
    });

    var visibleCount = 0;
    items.forEach(function (it) {
      var ok = true;
      for (var i = 0; i < filters.length; i++) {
        var f = filters[i];
        if (f.val && f.typeSel) {
          if (!matchItem(it, f.typeSel, f.val)) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        show(it);
        visibleCount++;
      } else {
        hide(it);
      }
    });

    var emptyEl = g.emptySel ? document.querySelector(g.emptySel) : null;
    var hideWrap = g.hideSel ? document.querySelector(g.hideSel) : null;
    if (visibleCount === 0) {
      hide(hideWrap || list);
      show(emptyEl);
    } else {
      show(hideWrap || list);
      hide(emptyEl);
    }

    if (USE_NATIVE) {
      g.triggers.forEach(function (t) {
        if (t.__nativeSelect) {
          hideNativeSelectEl(t.__nativeSelect, t.__arrowEl);
        }
      });
    }
    console.log("[rt-dropdown] applyGroup", key, {
      visible: visibleCount,
      total: items.length,
    });
  }
  function applyAllGroups() {
    groups.forEach(function (_, k) {
      applyGroup(k);
    });
  }
  function applyForTrigger(trigger) {
    applyGroup(groupKey(trigger));
  }
  function scrollIfNeeded(trigger) {
    var sel = trigger.getAttribute("data-rt-filter-scroll-reload");
    if (!sel) return;
    var target = document.querySelector(sel);
    if (!target) return;
    var top = window.scrollY + target.getBoundingClientRect().top;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  function hideNativeSelectEl(select, arrowEl) {
    if (!select) return;
    select.style.display = "none";
    select.style.visibility = "hidden";
    select.style.pointerEvents = "none";
    select.style.left = "-99999px";
    select.style.top = "-99999px";
    select.style.width = "0";
    select.style.height = "0";
    select.blur();
    if (arrowEl) {
      arrowEl.style.transform = "rotate(0deg) translate(0,-50%)";
    }
    if (currentOpenSelect === select) {
      currentOpenSelect = null;
      currentOpenArrow = null;
    }
  }

  function showNativeSelectEl(select, trigger, arrowEl) {
    if (!select || !trigger) return;
    if (currentOpenSelect && currentOpenSelect !== select) {
      hideNativeSelectEl(currentOpenSelect, currentOpenArrow);
    }
    var r = trigger.getBoundingClientRect();
    select.style.position = "fixed";
    select.style.left = r.left + "px";
    select.style.top = r.top + "px";
    select.style.width = r.width + "px";
    select.style.height = r.height + "px";
    select.style.display = "block";
    select.style.visibility = "visible";
    select.style.pointerEvents = "auto";
    select.style.zIndex = "999999";
    if (arrowEl) {
      arrowEl.style.transform = "rotate(180deg) translate(0,-50%)";
    }
    currentOpenSelect = select;
    currentOpenArrow = arrowEl;
    var onBlur = function () {
      hideNativeSelectEl(select, arrowEl);
      select.removeEventListener("blur", onBlur);
    };
    select.addEventListener("blur", onBlur);
    if (select.showPicker) {
      select.showPicker();
    } else {
      select.focus();
      select.click();
    }
  }

  document.addEventListener(
    "pointerdown",
    function (e) {
      if (!USE_NATIVE) return;
      if (currentOpenSelect) {
        var t = e.target;
        var isTrigger = t.closest && t.closest(ROOT);
        if (!isTrigger) {
          hideNativeSelectEl(currentOpenSelect, currentOpenArrow);
        }
      }
    },
    true
  );

  var boundClearAllSelectors = new Set();
  function updateClearAllVisibilityBySelector(sel) {
    if (!sel) return;
    var btn = document.querySelector(sel);
    if (!btn) return;
    var any = false;
    document
      .querySelectorAll(ROOT + '[data-rt-filter-all-clear="' + sel + '"]')
      .forEach(function (t) {
        if (t.__rtSelected) {
          any = true;
        }
      });
    btn.style.display = any ? "" : "none";
  }

  var boundTotalSelectors = new Set();
  function updateTotalFiltersTextBySelector(sel) {
    if (!sel) return;
    var target = document.querySelector(sel);
    if (!target) return;
    if (!target.__rtBaseText) {
      target.__rtBaseText = target.textContent || "";
    }
    var count = 0;
    document
      .querySelectorAll(
        ROOT + '[data-rt-dropdown-total-filters-text="' + sel + '"]'
      )
      .forEach(function (t) {
        if (t.__rtSelected) count++;
      });
    target.textContent =
      count > 0
        ? target.__rtBaseText + " (" + count + ")"
        : target.__rtBaseText;
  }

  function bindClearAllIfPresent(trigger) {
    var sel = trigger.getAttribute("data-rt-filter-all-clear");
    if (!sel) return;
    if (boundClearAllSelectors.has(sel)) return;
    var btn = document.querySelector(sel);
    if (!btn) return;
    boundClearAllSelectors.add(sel);
    updateClearAllVisibilityBySelector(sel);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var triggers = document.querySelectorAll(
        ROOT + '[data-rt-filter-all-clear="' + sel + '"]'
      );
      var firstScrollTarget = null;
      triggers.forEach(function (t) {
        var initialText = t.__initialText || "Select";
        var textEl = t.__textEl;
        var clearEl = t.__clearEl;
        var arrowEl = t.__arrowEl;
        var usingChoices = t.__usingChoices;
        var select = t.__nativeSelect;
        var choices = t.__choices;
        var container = t.__choicesContainer;
        t.__rtSelected = "";
        if (textEl) textEl.textContent = initialText;
        if (clearEl) clearEl.style.display = "none";
        if (usingChoices) {
          if (choices) {
            choices.removeActiveItems();
            choices.hideDropdown(true);
          }
          if (container) {
            container.style.pointerEvents = "none";
            container.style.visibility = "hidden";
            container.style.opacity = "0";
          }
        }
        if (select) {
          select.value = "";
          hideNativeSelectEl(select, arrowEl);
        }
        if (arrowEl) {
          arrowEl.style.transform = "rotate(0deg) translate(0,-50%)";
        }
        applyForTrigger(t);
        var s = t.getAttribute("data-rt-filter-scroll-reload");
        if (!firstScrollTarget && s) {
          firstScrollTarget = s;
        }
        var totalSel = t.getAttribute("data-rt-dropdown-total-filters-text");
        if (totalSel) updateTotalFiltersTextBySelector(totalSel);
      });
      syncParamKeyPeersBulk();
      updateClearAllVisibilityBySelector(sel);
      updateUrlFilters();
      if (firstScrollTarget) {
        var target = document.querySelector(firstScrollTarget);
        if (target) {
          var top = window.scrollY + target.getBoundingClientRect().top;
          window.scrollTo({ top: top, behavior: "smooth" });
        }
      }
      console.log("[rt-dropdown] clear-all clicked", sel);
    });
  }

  function sanitizeKeyForUrl(raw) {
    if (!raw) return "";
    return String(raw)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
  }
  function computeParamKey(trigger, typeSel) {
    var explicit = trigger.getAttribute("data-rt-filter-param");
    if (explicit) return explicit;
    if (typeSel) {
      var attr = attrFromSelector(typeSel);
      if (attr) return sanitizeKeyForUrl(attr);
    }
    var fallback =
      trigger.getAttribute("data-rt-filter-name") ||
      trigger.id ||
      trigger.getAttribute("name") ||
      trigger.getAttribute("data-rt-filter-type") ||
      "";
    return sanitizeKeyForUrl(fallback || "f");
  }

  function prettyValue(v) {
    var s = String(v == null ? "" : v)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/&/g, " and ");
    s = s.replace(/[@$%]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    s = s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return s;
  }

  function buildRtFiltersObject() {
    var pairs = {};
    document.querySelectorAll(ROOT).forEach(function (t) {
      var val = t.__rtSelected || "";
      if (!val) return;
      var typeSel = t.getAttribute("data-rt-filter-type");
      var key = t.__rtParamKey || computeParamKey(t, typeSel);
      if (!key) return;
      var pv =
        t.__valueToPretty && t.__valueToPretty[val]
          ? t.__valueToPretty[val]
          : val;
      pairs[key] = pv;
    });
    return pairs;
  }

  function encodeRtFilters(obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === "" || v == null) return;
      parts.push(k + ":" + v);
    });
    return parts.join(",");
  }

  function decodeRtFiltersParam(raw) {
    if (!raw) return {};
    var map = {};
    var parts = String(raw).split(",");
    parts.forEach(function (p) {
      var i = p.indexOf(":");
      if (i === -1) return;
      var k = p.slice(0, i);
      var v = p.slice(i + 1);
      if (k) map[k] = v;
    });
    return map;
  }

  function stringifySearchPreservingRt(rawRt) {
    var url = new URL(window.location.href);
    var sp = new URLSearchParams(url.search);
    sp.delete("rt-filters");
    var base = sp.toString();
    if (rawRt) {
      if (base) base = "?" + base + "&rt-filters=" + rawRt;
      else base = "?rt-filters=" + rawRt;
    } else {
      base = base ? "?" + base : "";
    }
    return base;
  }

  function updateUrlFilters() {
    try {
      var obj = buildRtFiltersObject();
      var v = encodeRtFilters(obj);
      var url = new URL(window.location.href);
      var newSearch = stringifySearchPreservingRt(v);
      var newUrl = url.pathname + newSearch + url.hash;
      window.history.replaceState({}, "", newUrl);
      console.log("[rt-dropdown] url updated", newUrl, obj);
    } catch (e) {
      console.log("[rt-dropdown] url update error", e);
    }
  }

  function hasRtFiltersInUrl() {
    try {
      var url = new URL(window.location.href);
      var raw = url.searchParams.get("rt-filters");
      return !!raw;
    } catch (e) {
      return false;
    }
  }

  function getExpectedTotalFromProxy() {
    var el = document.querySelector(
      "[data-rt-dropdown-filter-total-items-proxy]"
    );
    if (!el) return null;
    var txt = el.textContent || "";
    var m = txt.match(/(\d+)\s*$/);
    if (!m) return null;
    var v = parseInt(m[1], 10);
    if (isNaN(v)) return null;
    return v;
  }

  function firstItemSelectorFromGroups() {
    var sel = "";
    groups.forEach(function (g) {
      if (!sel && g && g.itemSel) sel = g.itemSel;
    });
    return sel || "";
  }

  function currentItemCount(sel) {
    if (!sel) return 0;
    return document.querySelectorAll(sel).length;
  }

  function activeTypeSelectors() {
    var set = new Set();
    document.querySelectorAll(ROOT).forEach(function (t) {
      var s = t.getAttribute("data-rt-filter-type");
      if (s) set.add(s);
    });
    return Array.from(set);
  }

  function markupReadyForTypes(itemSel, typeSels) {
    if (!itemSel || !typeSels.length) return true;
    var items = Array.prototype.slice
      .call(document.querySelectorAll(itemSel))
      .slice(0, 12);
    if (!items.length) return false;
    for (var j = 0; j < typeSels.length; j++) {
      var sel = typeSels[j];
      var okAny = false;
      for (var i = 0; i < items.length; i++) {
        var hits = items[i].querySelectorAll(sel);
        if (!hits.length) continue;
        var attr = attrFromSelector(sel);
        for (var k = 0; k < hits.length; k++) {
          var vv = valueFromNode(hits[k], attr);
          if (String(vv).trim()) {
            okAny = true;
            break;
          }
        }
        if (okAny) break;
      }
      if (!okAny) return false;
    }
    return true;
  }

  function isReadyForAutoFilter() {
    var expected = getExpectedTotalFromProxy();
    var itemSel = firstItemSelectorFromGroups();
    var count = currentItemCount(itemSel);
    var types = activeTypeSelectors();
    var markupOk = markupReadyForTypes(itemSel, types);
    console.log("[rt-dropdown] readiness", {
      expected: expected,
      itemSelector: itemSel,
      count: count,
      types: types.length,
      markupOk: markupOk,
    });
    if (expected == null) return false;
    if (!itemSel) return false;
    if (count !== expected) return false;
    if (!markupOk) return false;
    return true;
  }

  function applyUrlFiltersToTriggers() {
    console.log("[rt-dropdown] applying url filters begin");
    var affectedGroups = new Set();
    try {
      RT_SILENT = true;
      var url = new URL(window.location.href);
      var raw = url.searchParams.get("rt-filters");
      var map = decodeRtFiltersParam(raw);
      console.log("[rt-dropdown] parsed rt-filters", map);
      if (!Object.keys(map).length) {
        console.log("[rt-dropdown] no rt-filters map to apply");
        return;
      }
      document.querySelectorAll(ROOT).forEach(function (t) {
        var typeSel = t.getAttribute("data-rt-filter-type");
        var key = t.__rtParamKey || computeParamKey(t, typeSel);
        var dbgId = t.__dbgId || (t.__dbgId = uid());
        if (!key) {
          console.log("[rt-dropdown] skip trigger(no key)", dbgId);
          return;
        }
        if (!(key in map)) {
          console.log("[rt-dropdown] no incoming for key", dbgId, key);
          return;
        }
        var incoming = map[key] == null ? "" : String(map[key]);
        var desired = incoming;
        if (t.__prettyToValue && t.__prettyToValue[incoming])
          desired = t.__prettyToValue[incoming];
        try {
          if (t.__nativeSelect) t.__nativeSelect.value = desired;
        } catch (e) {}
        try {
          if (t.__usingChoices && t.__choices) {
            t.__choices.removeActiveItems();
            if (desired) t.__choices.setChoiceByValue(desired);
          }
        } catch (e) {}
        t.__rtSelected = desired;
        if (t.__textEl)
          t.__textEl.textContent = desired ? desired : t.__initialText;
        if (t.__clearEl) t.__clearEl.style.display = desired ? "" : "none";
        if (t.__choicesContainer && t.__usingChoices) {
          t.__choicesContainer.style.pointerEvents = "none";
          t.__choicesContainer.style.visibility = "hidden";
          t.__choicesContainer.style.opacity = "0";
        }
        affectedGroups.add(groupKey(t));
        console.log("[rt-dropdown] url->trigger", dbgId, {
          key: key,
          incoming: incoming,
          desired: desired,
        });
      });
      syncParamKeyPeersBulk(true);
    } catch (e) {
      console.log("[rt-dropdown] apply from url error", e);
    } finally {
      RT_SILENT = false;
      console.log("[rt-dropdown] silent off");
    }
    affectedGroups.forEach(function (k) {
      applyGroup(k);
    });
    document.querySelectorAll(ROOT).forEach(function (t) {
      var totalSel = t.getAttribute("data-rt-dropdown-total-filters-text");
      if (totalSel) updateTotalFiltersTextBySelector(totalSel);
      var casel = t.getAttribute("data-rt-filter-all-clear");
      if (casel) updateClearAllVisibilityBySelector(casel);
    });
    updateUrlFilters();
    scheduleSafetyReapplies();
    console.log("[rt-dropdown] applying url filters end");
  }

  function scheduleSafetyReapplies() {
    if (REAPPLY_IV) clearInterval(REAPPLY_IV);
    var attempts = 0;
    var maxAttempts = 6;
    REAPPLY_IV = setInterval(function () {
      attempts++;
      if (!hasRtFiltersInUrl()) {
        clearInterval(REAPPLY_IV);
        REAPPLY_IV = null;
        return;
      }
      var itemSel = firstItemSelectorFromGroups();
      var listSel = "";
      groups.forEach(function (g) {
        if (!listSel && g && g.listSel) listSel = g.listSel;
      });
      var list = listSel ? document.querySelector(listSel) : null;
      var expected = getExpectedTotalFromProxy();
      var visibleNow = 0;
      if (itemSel) {
        document.querySelectorAll(itemSel).forEach(function (it) {
          if (it.style.display !== "none") visibleNow++;
        });
      }
      console.log("[rt-dropdown] safety reapply tick", {
        attempts: attempts,
        visibleNow: visibleNow,
        expected: expected,
      });
      applyAllGroups();
      if (LIST_MO == null && list) {
        try {
          LIST_MO = new MutationObserver(function () {
            applyAllGroups();
          });
          LIST_MO.observe(list, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style"],
          });
        } catch (e) {}
      }
      if (attempts >= maxAttempts) {
        clearInterval(REAPPLY_IV);
        REAPPLY_IV = null;
      }
    }, 300);
  }

  function scrollAfterUrlApplied() {
    try {
      var sel = null;
      document.querySelectorAll(ROOT).forEach(function (t) {
        if (
          !sel &&
          t.__rtSelected &&
          t.getAttribute("data-rt-filter-scroll-reload")
        )
          sel = t.getAttribute("data-rt-filter-scroll-reload");
      });
      if (!sel) {
        document.querySelectorAll(ROOT).forEach(function (t) {
          if (!sel && t.getAttribute("data-rt-filter-scroll-reload"))
            sel = t.getAttribute("data-rt-filter-scroll-reload");
        });
      }
      if (!sel) {
        console.log("[rt-dropdown] no scroll target selector found");
        return;
      }
      var target = document.querySelector(sel);
      if (!target) {
        console.log("[rt-dropdown] scroll target not found for selector", sel);
        return;
      }
      var top = window.scrollY + target.getBoundingClientRect().top;
      console.log("[rt-dropdown] scrolling to", sel, "=>", top);
      requestAnimationFrame(function () {
        window.scrollTo({ top: top, behavior: "smooth" });
      });
    } catch (e) {
      console.log("[rt-dropdown] scroll error", e);
    }
  }

  function startWaitThenApplyFromUrl(offsetMs) {
    if (WAIT_STARTED) return;
    WAIT_STARTED = true;
    console.log(
      "[rt-dropdown] window loaded; delaying auto-apply by",
      offsetMs,
      "ms"
    );
    setTimeout(function () {
      console.log("[rt-dropdown] offset elapsed; starting readiness watch");
      var tick = function () {
        if (!isReadyForAutoFilter()) return;
        if (WAIT_MO) {
          try {
            WAIT_MO.disconnect();
          } catch (e) {}
          WAIT_MO = null;
        }
        if (WAIT_IV) {
          clearInterval(WAIT_IV);
          WAIT_IV = null;
        }
        console.log("[rt-dropdown] ready; applying url filters now");
        applyUrlFiltersToTriggers();
        scrollAfterUrlApplied();
      };
      WAIT_MO = new MutationObserver(function () {
        tick();
      });
      WAIT_MO.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
      WAIT_IV = setInterval(tick, 250);
      tick();
    }, Math.max(0, offsetMs | 0));
  }

  function syncParamKeyPeers(trigger, value, silentOnly) {
    var key = trigger.__rtParamKey;
    var peers = PARAM_GROUPS.get(key);
    if (!peers) return;
    if (SYNCING) return;
    var prevSilent = RT_SILENT;
    RT_SILENT = true;
    SYNCING = true;
    peers.forEach(function (p) {
      if (p === trigger) return;
      try {
        if (p.__nativeSelect) p.__nativeSelect.value = value || "";
      } catch (e) {}
      if (p.__usingChoices && p.__choices) {
        try {
          p.__choices.removeActiveItems();
          if (value) p.__choices.setChoiceByValue(value);
        } catch (e) {}
      }
      p.__rtSelected = value || "";
      if (p.__textEl) p.__textEl.textContent = value ? value : p.__initialText;
      if (p.__clearEl) p.__clearEl.style.display = value ? "" : "none";
    });
    SYNCING = false;
    RT_SILENT = prevSilent;
    if (!silentOnly) {
      applyForTrigger(trigger);
      updateUrlFilters();
    }
    console.log("[rt-dropdown] synced peers for key", key, {
      value: value,
      peers: peers.size,
    });
  }

  function syncParamKeyPeersBulk(silentOnly) {
    PARAM_GROUPS.forEach(function (set) {
      var picked = null;
      set.forEach(function (t) {
        if (picked == null) picked = t.__rtSelected || "";
      });
      if (picked == null) picked = "";
      set.forEach(function (p) {
        var prev = p.__rtSelected || "";
        if (prev === picked) return;
        try {
          if (p.__nativeSelect) p.__nativeSelect.value = picked;
        } catch (e) {}
        if (p.__usingChoices && p.__choices) {
          try {
            p.__choices.removeActiveItems();
            if (picked) p.__choices.setChoiceByValue(picked);
          } catch (e) {}
        }
        p.__rtSelected = picked;
        if (p.__textEl)
          p.__textEl.textContent = picked ? picked : p.__initialText;
        if (p.__clearEl) p.__clearEl.style.display = picked ? "" : "none";
      });
    });
    if (!silentOnly) {
      applyAllGroups();
      updateUrlFilters();
    }
    console.log("[rt-dropdown] bulk peer sync done");
  }

  function initOne(trigger) {
    registerTrigger(trigger);
    bindClearAllIfPresent(trigger);

    var textEl = trigger.querySelector("[data-rt-dropdown-selected-text]");
    var clearEl = trigger.querySelector("[data-rt-dropdown-clear]");
    var arrowEl = trigger.querySelector("[data-rt-dropdown-arrow]");
    var initialText =
      (textEl && textEl.textContent ? textEl.textContent.trim() : "") ||
      "Select";

    trigger.__textEl = textEl;
    trigger.__clearEl = clearEl;
    trigger.__arrowEl = arrowEl;
    trigger.__initialText = initialText;
    trigger.__dbgId = trigger.__dbgId || uid();

    if (clearEl) clearEl.style.display = "none";
    if (arrowEl)
      arrowEl.style.transition = "transform .28s cubic-bezier(0.19,1,0.22,1)";

    var srcOptions = Array.from(
      trigger.querySelectorAll("[data-rt-dropdown-option]")
    );

    var select = document.createElement("select");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    select.style.position = "fixed";
    select.style.left = "-99999px";
    select.style.top = "-99999px";
    select.style.width = "0";
    select.style.height = "0";
    select.style.opacity = "0";
    select.style.visibility = "hidden";
    select.style.pointerEvents = "none";
    select.style.zIndex = "999999";
    document.body.appendChild(select);

    trigger.__nativeSelect = select;

    var opts = srcOptions
      .map(function (el) {
        var v = (el.getAttribute("data-rt-dropdown-option") || "").trim();
        return v ? { value: v, label: v } : null;
      })
      .filter(Boolean);

    opts.forEach(function (o) {
      var op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      select.appendChild(op);
    });

    var usingChoices = !USE_NATIVE;
    trigger.__usingChoices = usingChoices;

    var valueToPretty = {};
    var prettyToValue = {};
    opts.forEach(function (o) {
      var pv = prettyValue(o.value);
      valueToPretty[o.value] = pv;
      if (!(pv in prettyToValue)) prettyToValue[pv] = o.value;
    });
    trigger.__valueToPretty = valueToPretty;
    trigger.__prettyToValue = prettyToValue;

    var typeSelForParam = trigger.getAttribute("data-rt-filter-type");
    var paramKeyComputed = computeParamKey(trigger, typeSelForParam);
    trigger.__rtParamKey = paramKeyComputed;
    registerParamKey(trigger);

    var choices = null,
      container = null,
      inner = null,
      list = null,
      openState = false;

    function align() {
      if (usingChoices && container) {
        var r = trigger.getBoundingClientRect();
        container.style.position = "fixed";
        container.style.left = r.left + "px";
        container.style.top = r.top + trigger.offsetHeight + "px";
        container.style.width = r.width + "px";
        container.style.right = "auto";
        container.style.zIndex = "9999";
      }
    }
    function rotateArrow(open) {
      if (!arrowEl) return;
      arrowEl.style.transform = open
        ? "rotate(180deg) translate(0,-50%)"
        : "rotate(0deg) translate(0,-50%)";
    }

    function applyOptionClasses() {
      if (!usingChoices) return;
      var map = {};
      srcOptions.forEach(function (el) {
        var v = (el.getAttribute("data-rt-dropdown-option") || "").trim();
        var c = (el.getAttribute("data-rt-dropdown-class") || "").trim();
        if (v && c) map[v] = c;
      });
      var items = container.querySelectorAll(
        ".choices__list--dropdown .choices__item"
      );
      items.forEach(function (ci) {
        var val = ci.getAttribute("data-value") || "";
        var cls = map[val];
        if (cls) ci.classList.add(cls);
      });
    }

    function setSelection(val, optsArg) {
      var o = optsArg || {};
      var updateUrl = o.updateUrl === false ? false : true;
      var dbgId = trigger.__dbgId || uid();
      trigger.__rtSelected = val || "";
      if (textEl) textEl.textContent = val ? val : initialText;
      if (clearEl) clearEl.style.display = val ? "" : "none";
      syncParamKeyPeers(trigger, val, true);
      applyForTrigger(trigger);
      var sel = trigger.getAttribute("data-rt-filter-all-clear");
      if (sel) updateClearAllVisibilityBySelector(sel);
      var totalSel = trigger.getAttribute(
        "data-rt-dropdown-total-filters-text"
      );
      if (totalSel) updateTotalFiltersTextBySelector(totalSel);
      if (o.scroll === true) scrollIfNeeded(trigger);
      if (updateUrl) updateUrlFilters();
      console.log("[rt-dropdown] setSelection", dbgId, {
        value: val,
        updateUrl: updateUrl,
        scroll: !!o.scroll,
        silent: RT_SILENT,
      });
    }

    function openChoices() {
      openState = true;
      align();
      container.style.pointerEvents = "auto";
      container.style.visibility = "visible";
      container.style.opacity = "1";
      choices.showDropdown(true);
      rotateArrow(true);
      applyOptionClasses();
      console.log("[rt-dropdown] openChoices", trigger.__dbgId);
    }
    function closeChoices() {
      openState = false;
      choices.hideDropdown(true);
      container.style.pointerEvents = "none";
      container.style.visibility = "hidden";
      container.style.opacity = "0";
      rotateArrow(false);
      console.log("[rt-dropdown] closeChoices", trigger.__dbgId);
    }

    if (usingChoices) {
      function initChoices() {
        choices = new Choices(select, {
          searchEnabled: false,
          shouldSort: false,
          itemSelectText: "",
          placeholder: true,
          placeholderValue: initialText,
          removeItems: false,
          removeItemButton: false,
          duplicateItemsAllowed: false,
          renderSelectedChoices: "always",
          allowHTML: false,
        });
        trigger.__choices = choices;
        choices.clearStore();
        choices.setChoices(opts, "value", "label", true);
        container = choices.containerOuter.element;
        trigger.__choicesContainer = container;
        inner = container.querySelector(".choices__inner");
        list = container.querySelector(
          ".choices__list.choices__list--dropdown"
        );
        inner.style.display = "none";
        container.style.pointerEvents = "none";
        container.style.visibility = "hidden";
        container.style.opacity = "0";
        container.style.transition = "opacity .2s ease";
        function onTriggerClick(e) {
          var inClear = clearEl && clearEl.contains(e.target);
          if (inClear) return;
          if (container.contains(e.target)) return;
          if (openState) closeChoices();
          else openChoices();
        }
        function onDocClick(e) {
          if (!trigger.contains(e.target) && !container.contains(e.target))
            closeChoices();
        }
        trigger.addEventListener("click", onTriggerClick);
        document.addEventListener("click", onDocClick);
        window.addEventListener("resize", align, { passive: true });
        window.addEventListener("scroll", align, {
          passive: true,
          capture: true,
        });
        if (list)
          list.addEventListener("click", function (e) {
            e.stopPropagation();
          });

        trigger.__choices.passedElement.element.addEventListener(
          "addItem",
          function (e) {
            var v =
              e && e.detail && e.detail.value != null
                ? String(e.detail.value)
                : "";
            console.log("[rt-dropdown] addItem(choices)", trigger.__dbgId, {
              value: v,
              silent: RT_SILENT,
            });
            if (RT_SILENT) return;
            setSelection(v, { scroll: true, updateUrl: true });
          }
        );
        trigger.__choices.passedElement.element.addEventListener(
          "removeItem",
          function () {
            console.log("[rt-dropdown] removeItem(choices)", trigger.__dbgId, {
              silent: RT_SILENT,
            });
            if (RT_SILENT) return;
            setSelection("", { scroll: true, updateUrl: true });
          }
        );
      }
      initChoices();
    } else {
      trigger.addEventListener("click", function (e) {
        var inClear = clearEl && clearEl.contains(e.target);
        if (inClear) return;
        showNativeSelectEl(select, trigger, arrowEl);
      });
    }

    select.addEventListener("change", function (e) {
      var val = e.target.value || "";
      if (RT_SILENT) {
        setSelection(val, { scroll: false, updateUrl: false });
        if (trigger.__usingChoices) {
          closeChoices();
        } else {
          hideNativeSelectEl(select, trigger.__arrowEl);
        }
        console.log("[rt-dropdown] change handled(silent)", trigger.__dbgId, {
          val: val,
        });
        return;
      }
      setSelection(val, { scroll: true, updateUrl: true });
      if (trigger.__usingChoices) {
        closeChoices();
      } else {
        hideNativeSelectEl(select, trigger.__arrowEl);
      }
      console.log("[rt-dropdown] change handled", trigger.__dbgId, {
        val: val,
      });
    });

    if (clearEl) {
      clearEl.addEventListener("click", function (e) {
        e.stopPropagation();
        if (trigger.__usingChoices) {
          if (trigger.__choices) {
            trigger.__choices.removeActiveItems();
          }
        }
        select.value = "";
        setSelection("", { scroll: true });
        if (trigger.__usingChoices) {
          closeChoices();
        } else {
          hideNativeSelectEl(select, trigger.__arrowEl);
        }
        console.log("[rt-dropdown] clear clicked", trigger.__dbgId);
      });
    }

    var labelNow =
      (textEl && textEl.textContent ? textEl.textContent.trim() : "") || "";
    if (
      labelNow &&
      opts.some(function (o) {
        return o.value === labelNow;
      })
    ) {
      select.value = labelNow;
      if (trigger.__usingChoices && window.Choices) {
        trigger.__choices && trigger.__choices.setChoiceByValue(labelNow);
      }
      setSelection(labelNow, { scroll: false, updateUrl: false });
    } else {
      select.value = "";
      setSelection("", { scroll: false, updateUrl: false });
    }

    var casel = trigger.getAttribute("data-rt-filter-all-clear");
    if (casel) {
      updateClearAllVisibilityBySelector(casel);
    }
    var totalSelInit = trigger.getAttribute(
      "data-rt-dropdown-total-filters-text"
    );
    if (totalSelInit) {
      updateTotalFiltersTextBySelector(totalSelInit);
    }
  }

  function resolveAutoDelayMs() {
    var v = NaN;
    var el = document.querySelector(
      "[data-rt-dropdown-filter-total-items-proxy]"
    );
    if (el) {
      var a = parseInt(
        el.getAttribute("data-rt-dropdown-url-apply-delay") || "",
        10
      );
      if (isFinite(a) && a >= 0 && a <= 60000) v = a;
    }
    if (!isFinite(v)) {
      var b = parseInt(
        document.documentElement.getAttribute(
          "data-rt-dropdown-url-apply-delay"
        ) || "",
        10
      );
      if (isFinite(b) && b >= 0 && b <= 60000) v = b;
    }
    if (!isFinite(v)) v = 500;
    return v | 0;
  }

  function boot() {
    console.log("[rt-dropdown] boot", {
      useNative: USE_NATIVE,
      url: window.location.href,
    });
    var doInit = function () {
      document.querySelectorAll(ROOT).forEach(initOne);
      document.querySelectorAll(ROOT).forEach(function (t) {
        var src = t.querySelectorAll("[data-rt-dropdown-option]");
        if (src.length && t.__valueToPretty) {
          Object.keys(t.__valueToPretty).forEach(function (k) {
            t.__valueToPretty[k] = prettyValue(k);
            if (!(t.__valueToPretty[k] in t.__prettyToValue))
              t.__prettyToValue[t.__valueToPretty[k]] = k;
          });
        }
      });
      if (hasRtFiltersInUrl()) {
        var d = resolveAutoDelayMs();
        window.addEventListener("load", function () {
          console.log("[rt-dropdown] window load fired");
          startWaitThenApplyFromUrl(d);
        });
        window.addEventListener("pageshow", function () {
          if (hasRtFiltersInUrl()) scheduleSafetyReapplies();
        });
      } else {
        console.log("[rt-dropdown] no rt-filters in url");
      }
    };
    if (USE_NATIVE) {
      doInit();
    } else {
      loadCSS(cssHref)
        .then(function () {
          return loadJS(jsSrc);
        })
        .then(doInit);
    }
  }
  boot();
})();
