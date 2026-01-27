// (async () => {
//   const section = document.querySelector("#process-section");
//   if (!section) return;
//   const video = document.querySelector("#process-hot-video");
//   if (!video) return;

//   async function loadScript(src) {
//     if (document.querySelector(`script[src="${src}"]`)) return;
//     await new Promise((res, rej) => {
//       const s = document.createElement("script");
//       s.src = src;
//       s.onload = res;
//       s.onerror = rej;
//       document.head.appendChild(s);
//     });
//   }

//   await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
//   await loadScript(
//     "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"
//   );

//   gsap.registerPlugin(ScrollTrigger);

//   function awaitMetadata(v) {
//     return new Promise((res) => {
//       if (isFinite(v.duration) && v.duration > 0) return res();
//       const onMeta = () => {
//         v.removeEventListener("loadedmetadata", onMeta);
//         res();
//       };
//       v.addEventListener("loadedmetadata", onMeta, { once: true });
//       try {
//         v.load();
//       } catch (e) {}
//     });
//   }

//   async function init() {
//     await awaitMetadata(video);
//     video.muted = true;
//     video.playsInline = true;
//     video.removeAttribute("loop");
//     try {
//       video.pause();
//     } catch (e) {}

//     ScrollTrigger.getAll().forEach((st) => {
//       if (st.vars && st.vars.id === "__process_video_scroll__") st.kill();
//     });

//     gsap.to(video, {
//       currentTime: video.duration || 1,
//       ease: "none",
//       scrollTrigger: {
//         id: "__process_video_scroll__",
//         trigger: section,
//         start: "top top",
//         end: "bottom bottom",
//         scrub: true,
//         onEnter: () => {
//           try {
//             video.load();
//           } catch (e) {}
//         },
//         onUpdate: (self) => {
//           const d = video.duration || 0;
//           if (!d || !isFinite(d)) return;
//           const t = self.progress * d;
//           if (Math.abs(video.currentTime - t) > 0.03) video.currentTime = t;
//         },
//       },
//     });

//     window.addEventListener("resize", () => ScrollTrigger.refresh());
//     console.log("[process-video] scroll-sync initialized");
//   }

//   document.addEventListener("visibilitychange", () => {
//     if (document.hidden) {
//       try {
//         video.pause();
//       } catch (e) {}
//     }
//   });

//   init();
// })();
