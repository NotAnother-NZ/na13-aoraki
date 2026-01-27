(async function () {
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error("load-failed:" + src));
      document.head.appendChild(s);
    });
  }

  function injectQrCssGuard(size) {
    const id = "__pdf_qr_css_guard__";
    if (document.getElementById(id)) return;
    const css = `
#pdf-qr-code{width:${size}px!important;height:${size}px!important;min-width:${size}px!important;min-height:${size}px!important;max-width:${size}px!important;max-height:${size}px!important;aspect-ratio:1/1!important;display:inline-block!important;box-sizing:content-box!important;padding:0!important;border:0!important;flex:none!important;align-self:flex-start!important;transform:none!important}
#pdf-qr-code canvas,#pdf-qr-code img{width:${size}px!important;height:${size}px!important;min-width:${size}px!important;min-height:${size}px!important;max-width:${size}px!important;max-height:${size}px!important;aspect-ratio:1/1!important;display:block!important;object-fit:contain!important;box-sizing:content-box!important;transform:none!important;image-rendering:pixelated!important}
    `.trim();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  const t0 = performance.now();
  console.log("[PDF] Init start");

  const libs = [
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  ];
  try {
    for (const lib of libs) {
      const l0 = performance.now();
      await loadScript(lib);
      console.log(
        "[PDF] Loaded lib",
        lib,
        "in",
        Math.round(performance.now() - l0),
        "ms"
      );
    }
  } catch (e) {
    console.error("[PDF] Failed to load libs", e && e.message);
  }

  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  const IS_IOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    ((navigator.platform === "MacIntel" ||
      navigator.userAgent.includes("Mac")) &&
      navigator.maxTouchPoints > 1);
  const PAGE_W = 1440;
  const PAGE_H = 2038;
  const CONTENT_H = 1858;

  const PDF_UNIT = "mm";
  const PDF_W = 210;
  const PDF_H = 297;

  const BASE_SCALE = window.devicePixelRatio || 1;
  const CAPTURE_SCALE = IS_ANDROID
    ? 1
    : IS_IOS
    ? Math.min(BASE_SCALE, 2)
    : BASE_SCALE;
  const PAGE_JPEG_QUALITY = 0.8;
  const MAX_RETRIES = 3;
  const MAX_DURATION_MS = 50000;
  const QR_CSS_PX = 128;
  const QR_BITMAP_PX = 256;

  console.log("[PDF] Env", {
    IS_ANDROID,
    IS_IOS,
    BASE_SCALE,
    CAPTURE_SCALE,
    PAGE_W,
    PAGE_H,
    CONTENT_H,
    PDF_UNIT,
    PDF_W,
    PDF_H,
    PAGE_JPEG_QUALITY,
    MAX_RETRIES,
    MAX_DURATION_MS,
  });

  let pdfBlobUrl = null;

  function whenReady() {
    return new Promise((resolve) => {
      let done = false;
      function finish(tag) {
        if (done) return;
        done = true;
        console.log("[PDF] Ready gate via", tag);
        resolve();
      }
      if (document.readyState === "complete") {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => finish("immediate"))
        );
      } else {
        window.addEventListener(
          "load",
          () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => finish("load"))
            ),
          { once: true }
        );
        window.addEventListener(
          "pageshow",
          () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => finish("pageshow"))
            ),
          { once: true }
        );
        setTimeout(() => finish("timeout-3s"), 3000);
      }
    });
  }

  async function waitFonts() {
    try {
      if (document.fonts && document.fonts.ready) {
        const t = performance.now();
        await Promise.race([
          document.fonts.ready,
          new Promise((r) => setTimeout(r, 2500)),
        ]);
        console.log(
          "[PDF] Fonts waited",
          Math.round(performance.now() - t),
          "ms"
        );
      }
    } catch {}
  }

  async function waitForStableLayout(el, sampleMs, maxMs) {
    const start = performance.now();
    let last = el.getBoundingClientRect();
    while (performance.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, sampleMs));
      const now = el.getBoundingClientRect();
      const drift =
        Math.abs(now.width - last.width) + Math.abs(now.height - last.height);
      if (drift < 0.5) break;
      last = now;
    }
    console.log(
      "[PDF] Layout stabilized in",
      Math.round(performance.now() - start),
      "ms"
    );
  }

  function absUrl(u) {
    try {
      return new URL(u, window.location.origin).toString();
    } catch {
      return null;
    }
  }

  async function preloadImages(root) {
    const allImgs = Array.from(root.querySelectorAll("img[src]"));
    const imgs = allImgs.filter((i) => i.offsetParent !== null);
    console.log(
      "[PDF] Preload images: found",
      allImgs.length,
      "visible",
      imgs.length
    );
    let ok = 0;
    let fail = 0;
    const t = performance.now();
    function isCrossOrigin(u) {
      try {
        const url = new URL(u, window.location.origin);
        return url.origin !== window.location.origin;
      } catch {
        return false;
      }
    }
    function perImageTimeout(p, ms) {
      return Promise.race([
        p,
        new Promise((r) => setTimeout(() => r("__timeout__"), ms)),
      ]);
    }
    const tasks = imgs.map(async (img) => {
      try {
        const current = img.currentSrc || img.getAttribute("src") || "";
        if (!current) return;
        if (/^(data:|blob:)/i.test(current)) {
          await new Promise((r) => {
            if (img.complete && img.naturalWidth > 0) return r();
            img.onload = () => r();
            img.onerror = () => r();
            setTimeout(() => r(), 1500);
          });
          ok += 1;
          return;
        }
        if (!isCrossOrigin(current)) {
          await new Promise((r) => {
            if (img.complete && img.naturalWidth > 0) return r();
            img.onload = () => r();
            img.onerror = () => r();
            setTimeout(() => r(), 3000);
          });
          ok += 1;
          return;
        }
        const u = new URL(current, window.location.origin).toString();
        const fetched = await perImageTimeout(
          fetch(u, {
            mode: "cors",
            credentials: "omit",
            cache: "force-cache",
          }).then((r) =>
            r.ok
              ? r.blob()
              : Promise.reject(new Error("bad-status:" + r.status))
          ),
          6000
        );
        if (fetched === "__timeout__") throw new Error("fetch-timeout");
        const obj = URL.createObjectURL(fetched);
        img.crossOrigin = "anonymous";
        img.src = obj;
        const loaded = await perImageTimeout(
          new Promise((r) => {
            if (img.complete && img.naturalWidth > 0) return r(true);
            img.onload = () => r(true);
            img.onerror = () => r(false);
          }),
          3000
        );
        if (!loaded || loaded === "__timeout__")
          throw new Error("load-timeout");
        ok += 1;
      } catch {
        fail += 1;
      }
    });
    await Promise.allSettled(tasks);
    console.log("[PDF] Preload images complete", {
      ok,
      fail,
      ms: Math.round(performance.now() - t),
    });
  }

  function canvasToDataUrl(c, sizePx) {
    try {
      if (!(c && c.width && c.height)) return null;
      const s = sizePx || Math.max(c.width, c.height);
      const tmp = document.createElement("canvas");
      tmp.width = s;
      tmp.height = s;
      const ctx = tmp.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, s, s);
      return tmp.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  function imageToDataUrl(img, sizePx) {
    try {
      if (!(img && img.naturalWidth && img.naturalHeight)) return null;
      const s = sizePx || Math.max(img.naturalWidth, img.naturalHeight);
      const tmp = document.createElement("canvas");
      tmp.width = s;
      tmp.height = s;
      const ctx = tmp.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, s, s);
      return tmp.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  function enforceSquareBox(el, cssPx) {
    el.style.setProperty("width", cssPx + "px", "important");
    el.style.setProperty("height", cssPx + "px", "important");
    el.style.setProperty("min-width", cssPx + "px", "important");
    el.style.setProperty("min-height", cssPx + "px", "important");
    el.style.setProperty("max-width", cssPx + "px", "important");
    el.style.setProperty("max-height", cssPx + "px", "important");
    el.style.setProperty("aspect-ratio", "1 / 1", "important");
    el.style.setProperty("display", "inline-block", "important");
    el.style.setProperty("box-sizing", "content-box", "important");
    el.style.setProperty("padding", "0", "important");
    el.style.setProperty("border", "0", "important");
    el.style.setProperty("flex", "none", "important");
    el.style.setProperty("align-self", "flex-start", "important");
    el.style.setProperty("transform", "none", "important");
  }

  function enforceSquareChild(el, cssPx) {
    if (!el) return;
    el.style.setProperty("width", cssPx + "px", "important");
    el.style.setProperty("height", cssPx + "px", "important");
    el.style.setProperty("min-width", cssPx + "px", "important");
    el.style.setProperty("min-height", cssPx + "px", "important");
    el.style.setProperty("max-width", cssPx + "px", "important");
    el.style.setProperty("max-height", cssPx + "px", "important");
    el.style.setProperty("aspect-ratio", "1 / 1", "important");
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("object-fit", "contain", "important");
    el.style.setProperty("box-sizing", "content-box", "important");
    el.style.setProperty("transform", "none", "important");
    el.style.setProperty("image-rendering", "pixelated", "important");
  }

  function freezeQrAsImg() {
    const qr = document.getElementById("pdf-qr-code");
    if (!qr) return false;
    enforceSquareBox(qr, QR_CSS_PX);
    let dataUrl = null;
    const cvs = qr.querySelector("canvas");
    const img = qr.querySelector("img");
    if (cvs) dataUrl = canvasToDataUrl(cvs, QR_BITMAP_PX);
    if (!dataUrl && img && img.complete)
      dataUrl = imageToDataUrl(img, QR_BITMAP_PX);
    if (!dataUrl) return false;
    qr.innerHTML = "";
    const out = document.createElement("img");
    out.src = dataUrl;
    out.width = QR_CSS_PX;
    out.height = QR_CSS_PX;
    enforceSquareChild(out, QR_CSS_PX);
    qr.appendChild(out);
    const br = qr.getBoundingClientRect();
    const ok =
      Math.round(br.width) === QR_CSS_PX && Math.round(br.height) === QR_CSS_PX;
    console.log("[PDF] QR box", { w: br.width, h: br.height, ok });
    return true;
  }

  async function generateQrCode() {
    injectQrCssGuard(QR_CSS_PX);
    const t = performance.now();
    return new Promise((resolve) => {
      const qr = document.getElementById("pdf-qr-code");
      if (!qr) {
        console.log("[PDF] QR: container not found, skipping");
        return resolve();
      }
      qr.innerHTML = "";
      enforceSquareBox(qr, QR_CSS_PX);
      const raw = qr.getAttribute("title") || window.location.href || "";
      const text = String(raw);
      try {
        new QRCode(qr, { text, width: QR_CSS_PX, height: QR_CSS_PX });
      } catch (e) {
        console.warn("[PDF] QR: init failed, skipping", e && e.message);
        return resolve();
      }
      const started = Date.now();
      const poll = () => {
        const img = qr.querySelector("img");
        const cvs = qr.querySelector("canvas");
        if (
          (img && img.complete && img.naturalWidth > 0) ||
          (cvs && cvs.width > 0 && cvs.height > 0) ||
          Date.now() - started > 4000
        ) {
          const ok = freezeQrAsImg();
          if (!ok) console.warn("[PDF] QR: could not freeze cleanly");
          console.log(
            "[PDF] QR ready in",
            Math.round(performance.now() - t),
            "ms"
          );
          return resolve();
        }
        requestAnimationFrame(poll);
      };
      poll();
    });
  }

  function normalizeUrl(href) {
    try {
      if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
      return new URL(href, window.location.origin).toString();
    } catch {
      return null;
    }
  }

  function pageShellFrom(sourceRoot, idx) {
    const shell = sourceRoot.cloneNode(false);
    for (const a of sourceRoot.attributes) shell.setAttribute(a.name, a.value);
    shell.id = "pdf-printable-page-" + idx;
    shell.style.width = PAGE_W + "px";
    shell.style.height = PAGE_H + "px";
    return shell;
  }

  function cloneKeepingAttrs(el) {
    const clone = el.cloneNode(false);
    for (const a of el.attributes) clone.setAttribute(a.name, a.value);
    return clone;
  }

  function measureOuterHeight(el) {
    const cs = getComputedStyle(el);
    return (
      el.getBoundingClientRect().height +
      parseFloat(cs.marginTop) +
      parseFloat(cs.marginBottom)
    );
  }

  function paginate(sourceRoot) {
    const t = performance.now();
    const pagesRoot = document.createElement("div");
    pagesRoot.id = "pdf-pages-root";
    sourceRoot.insertAdjacentElement("afterend", pagesRoot);
    let pageIndex = 1;
    let currentPage = pageShellFrom(sourceRoot, pageIndex);
    pagesRoot.appendChild(currentPage);
    let usedHeight = 0;
    const ordered = Array.from(sourceRoot.children);
    console.log("[PDF] Paginate: children", ordered.length);
    let splitCount = 0;
    for (const node of ordered) {
      const mode = node.getAttribute("data-pdf-generator-element") || "full";
      if (mode === "full") {
        const block = node.cloneNode(true);
        currentPage.appendChild(block);
        const h = measureOuterHeight(block);
        if (usedHeight + h <= CONTENT_H) {
          usedHeight += h;
        } else {
          block.remove();
          pageIndex++;
          currentPage = pageShellFrom(sourceRoot, pageIndex);
          pagesRoot.appendChild(currentPage);
          usedHeight = 0;
          currentPage.appendChild(block);
          usedHeight = Math.min(measureOuterHeight(block), CONTENT_H);
        }
      } else if (mode === "separate") {
        let wrapper = cloneKeepingAttrs(node);
        currentPage.appendChild(wrapper);
        let wrapperHasChild = false;
        const kids = Array.from(node.children);
        for (const kid of kids) {
          const kidClone = kid.cloneNode(true);
          wrapper.appendChild(kidClone);
          const h = measureOuterHeight(kidClone);
          if (usedHeight + h <= CONTENT_H) {
            usedHeight += h;
            wrapperHasChild = true;
          } else {
            kidClone.remove();
            if (!wrapperHasChild) wrapper.remove();
            pageIndex++;
            currentPage = pageShellFrom(sourceRoot, pageIndex);
            pagesRoot.appendChild(currentPage);
            usedHeight = 0;
            wrapper = cloneKeepingAttrs(node);
            currentPage.appendChild(wrapper);
            wrapper.appendChild(kidClone);
            const h2 = measureOuterHeight(kidClone);
            usedHeight = Math.min(h2, CONTENT_H);
            wrapperHasChild = true;
            splitCount += 1;
          }
        }
        if (!wrapperHasChild) wrapper.remove();
      } else {
        const block = node.cloneNode(true);
        currentPage.appendChild(block);
        const h = measureOuterHeight(block);
        if (usedHeight + h <= CONTENT_H) {
          usedHeight += h;
        } else {
          block.remove();
          pageIndex++;
          currentPage = pageShellFrom(sourceRoot, pageIndex);
          pagesRoot.appendChild(currentPage);
          usedHeight = 0;
          currentPage.appendChild(block);
          usedHeight = Math.min(measureOuterHeight(block), CONTENT_H);
        }
      }
    }
    console.log(
      "[PDF] Paginate: pages",
      pageIndex,
      "splits",
      splitCount,
      "in",
      Math.round(performance.now() - t),
      "ms"
    );
    return pagesRoot;
  }

  async function makePdfFrom(pagesRoot) {
    const t = performance.now();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "p",
      unit: PDF_UNIT,
      format: [PDF_W, PDF_H],
      compress: true,
    });
    const pages = Array.from(pagesRoot.children);
    let first = true;
    const totalPages = pages.length;
    console.log("[PDF] Render: pages to render", totalPages);

    const mmPerPxX = PDF_W / PAGE_W;
    const mmPerPxY = PDF_H / PAGE_H;
    const pageNumberFontSize = 28 * mmPerPxX;
    const pageNumberOffsetX = 70 * mmPerPxX;
    const pageNumberOffsetY = 50 * mmPerPxY;

    for (let i = 0; i < totalPages; i++) {
      const stepT = performance.now();
      const page = pages[i];
      const rect = page.getBoundingClientRect();
      const anchors = Array.from(page.querySelectorAll("a[href]"))
        .filter((a) => a.offsetParent !== null)
        .map((a) => {
          const r = a.getBoundingClientRect();
          return {
            href: normalizeUrl(a.getAttribute("href")),
            left: r.left - rect.left,
            top: r.top - rect.top,
            width: r.width,
            height: r.height,
          };
        })
        .filter((a) => a.href && a.width > 0 && a.height > 0);
      let canvas;
      try {
        canvas = await html2canvas(page, {
          scale: CAPTURE_SCALE,
          useCORS: true,
          imageTimeout: 0,
        });
      } catch (err) {
        console.error(
          "[PDF] html2canvas failed on page",
          i + 1,
          err && err.message
        );
        throw err;
      }
      const dataUrl = canvas.toDataURL("image/jpeg", PAGE_JPEG_QUALITY);

      const imgAspect = PAGE_W / PAGE_H;
      const pdfAspect = PDF_W / PDF_H;
      let renderW = PDF_W;
      let renderH = PDF_H;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > pdfAspect) {
        renderW = PDF_W;
        renderH = PDF_W / imgAspect;
        offsetY = (PDF_H - renderH) / 2;
      } else {
        renderH = PDF_H;
        renderW = PDF_H * imgAspect;
        offsetX = (PDF_W - renderW) / 2;
      }

      if (!first) pdf.addPage([PDF_W, PDF_H], "p");
      pdf.addImage(
        dataUrl,
        "JPEG",
        offsetX,
        offsetY,
        renderW,
        renderH,
        undefined,
        "FAST"
      );

      const scaleX = renderW / PAGE_W;
      const scaleY = renderH / PAGE_H;

      anchors.forEach((a) => {
        pdf.link(
          offsetX + a.left * scaleX,
          offsetY + a.top * scaleY,
          a.width * scaleX,
          a.height * scaleY,
          {
            url: a.href,
          }
        );
      });

      pdf.setFontSize(pageNumberFontSize);
      pdf.text(
        `${i + 1} / ${totalPages}`,
        PDF_W - pageNumberOffsetX,
        PDF_H - pageNumberOffsetY,
        {
          align: "right",
        }
      );

      first = false;
      console.log("[PDF] Render page", i + 1, "/", totalPages, {
        anchors: anchors.length,
        ms: Math.round(performance.now() - stepT),
      });
    }
    const blob = pdf.output("blob");
    pdfBlobUrl = URL.createObjectURL(blob);
    console.log(
      "[PDF] Render complete in",
      Math.round(performance.now() - t),
      "ms",
      { blobUrl: !!pdfBlobUrl }
    );
  }

  function fileName() {
    const el = document.querySelector("#pdf-file-name");
    if (el && el.textContent.trim()) {
      return (
        el.textContent
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "") + ".pdf"
      );
    }
    return "recipe.pdf";
  }

  function hideWorkingDom() {
    const src =
      document.querySelector("#pdf-printable") ||
      document.querySelector("#recipe-printable");
    if (src) {
      src.style.display = "none";
      console.log("[PDF] Hide source root");
    }
    const pagesRoot = document.querySelector("#pdf-pages-root");
    if (pagesRoot) {
      pagesRoot.style.display = "none";
      console.log("[PDF] Hide generated pages root");
    }
  }

  function showDownloadButton() {
    const btn = document.querySelector("#print-recipe");
    if (!btn) {
      console.warn("[PDF] No #print-recipe button to show");
      return;
    }
    btn.style.display = "";
    btn.disabled = false;
    console.log("[PDF] Show download button");
  }

  function hideDownloadButton() {
    const btn = document.querySelector("#print-recipe");
    if (!btn) {
      console.warn("[PDF] No #print-recipe button to hide");
      return;
    }
    btn.style.display = "none";
    btn.disabled = true;
    console.log("[PDF] Hide download button");
  }

  function bindDownload() {
    const btn = document.querySelector("#print-recipe");
    if (!btn) {
      console.warn("[PDF] Cannot bind download, button missing");
      return;
    }
    if (btn._pdfBound) {
      console.log("[PDF] Download handler already bound");
      return;
    }
    let lastTriggerTs = 0;
    const CLICK_DEBOUNCE_MS = 600;
    function triggerDownload() {
      if (!pdfBlobUrl) {
        console.warn("[PDF] Open attempted but no blob URL");
        return;
      }
      const w = window.open(pdfBlobUrl, "_blank", "noopener,noreferrer");
      if (!w) {
        const a = document.createElement("a");
        a.href = pdfBlobUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      console.log("[PDF] Opened PDF in new tab", fileName());
    }
    function onClick(e) {
      const now = Date.now();
      if (now - lastTriggerTs < CLICK_DEBOUNCE_MS) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lastTriggerTs = now;
      triggerDownload();
    }
    btn.addEventListener("click", onClick);
    btn._pdfBound = true;
    btn.style.display = "";
    btn.disabled = false;
    console.log("[PDF] Bound single-click open handler with debounce");
  }

  async function tryBuildOnce() {
    const sT = performance.now();
    const sourceRoot =
      document.querySelector("#pdf-printable") ||
      document.querySelector("#recipe-printable");
    if (!sourceRoot) {
      const err = new Error("no-source");
      err.code = "no-source";
      throw err;
    }
    console.log("[PDF] Build start");
    await waitFonts();
    await waitForStableLayout(sourceRoot, 120, 2000);
    await generateQrCode();
    await preloadImages(sourceRoot);
    const pagesRoot = paginate(sourceRoot);
    await makePdfFrom(pagesRoot);
    console.log(
      "[PDF] Build success in",
      Math.round(performance.now() - sT),
      "ms"
    );
  }

  function deadlineExceeded(startTs) {
    return Date.now() - startTs > MAX_DURATION_MS;
  }

  function backoff(attempt) {
    const base = 600;
    const jitter = Math.floor(Math.random() * 300);
    return base * Math.pow(1.6, attempt) + jitter;
  }

  await whenReady();

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) console.log("[PDF] BFCache restore detected");
  });

  (async () => {
    const btn = document.querySelector("#print-recipe");
    if (btn) {
      btn.style.display = "none";
      btn.disabled = true;
      console.log("[PDF] Button hidden initially");
    }
    const src =
      document.querySelector("#pdf-printable") ||
      document.querySelector("#recipe-printable");
    if (!src) {
      console.error("[PDF] Source root not found, aborting");
      hideDownloadButton();
      return;
    }

    const start = Date.now();
    let success = false;
    let attempts = 0;

    try {
      while (attempts <= MAX_RETRIES && !success && !deadlineExceeded(start)) {
        try {
          console.log("[PDF] Attempt", attempts + 1, "of", MAX_RETRIES + 1);
          await tryBuildOnce();
          success = true;
        } catch (e) {
          attempts += 1;
          console.warn("[PDF] Attempt failed", {
            attempt: attempts,
            reason: e && (e.code || e.message),
          });
          const wait = backoff(attempts - 1);
          console.log("[PDF] Backoff", wait, "ms");
          await new Promise((r) => setTimeout(r, wait));
        }
      }

      if (deadlineExceeded(start))
        console.warn("[PDF] Aborted due to max duration exceeded");

      if (success) {
        hideWorkingDom();
        showDownloadButton();
        bindDownload();
        console.log("[PDF] Ready");
      } else {
        hideWorkingDom();
        hideDownloadButton();
        console.error("[PDF] Failed to prepare PDF after retries; UI hidden");
      }
    } catch (fatal) {
      console.error("[PDF] Fatal error", fatal && fatal.message);
      hideWorkingDom();
      hideDownloadButton();
    }
  })();
})();
