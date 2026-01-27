const galleryswiper = new Swiper('[swiper="image"]', {
  // Navigation arrows
  slidesPerView: 1.05,
  spaceBetween: 16,
  pagination: {
    el: ".swiper-pagination",
    type: "progressbar",
  },
  breakpoints: {
    1024: {
      slidesPerView: 1.5,
      spaceBetween: 24,
    },
  },
  navigation: {
    nextEl: '[swiper-next="image"]',
    prevEl: '[swiper-prev="image"]',
  },
});

const recipeswiper = new Swiper('[swiper="recipe"]', {
  // Navigation arrows
  slidesPerView: 1.1,
  spaceBetween: 16,
  pagination: {
    el: ".recipeswiper-pagination",
    type: "progressbar",
  },
  breakpoints: {
    767: {
      slidesPerView: 2,
      spaceBetween: 24,
    },

    1024: {
      slidesPerView: 4,
      spaceBetween: 24,
    },
  },
  navigation: {
    nextEl: '[swiper-next="recipe"]',
    prevEl: '[swiper-prev="recipe"]',
  },
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing Plyr and thumbnails...");

  // Add CSS to fix fonts and hide related videos
  const styleElement = document.createElement("style");
  styleElement.textContent = `
      /* Fix Plyr font to use sans-serif */
      .plyr, 
      .plyr button,
      .plyr__controls,
      .plyr__control,
      .plyr__menu__container,
      .plyr__controls button,
      .plyr__controls .plyr__time,
      .plyr__progress__buffer,
      .plyr__tooltip,
      .plyr *::placeholder,
      .plyr__menu__container .plyr__control,
      .plyr__menu__container button {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important;
        font-weight: 400 !important;
        text-shadow: none !important;
      }
      
      /* Hide related videos elements */
      .ytp-related-videos-frame,
      .ytp-related,
      .ytp-endscreen-content,
      .ytp-ce-element,
      .ytp-pause-overlay {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
  document.head.appendChild(styleElement);

  // Wait for Plyr to be available
  if (
    typeof Plyr === "undefined" &&
    document.querySelectorAll("[data-dt-yt-video]").length > 0
  ) {
    console.error(
      "Plyr library not found! Make sure you have included the Plyr script."
    );
  }

  // Function to extract YouTube ID from URL
  function extractYouTubeID(url) {
    const regex =
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
  }

  // Function to get YouTube thumbnail URL (for a specific resolution)
  function getYouTubeThumbnail(id, quality = "maxresdefault") {
    return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : "";
  }

  // PART 1: HANDLE VIDEO PLAYERS
  // Find all elements with data-dt-yt-video attribute
  const videoContainers = document.querySelectorAll("[data-dt-yt-video]");
  console.log(`Found ${videoContainers.length} video containers`);

  videoContainers.forEach(function (container, index) {
    const youtubeUrl = container.getAttribute("data-dt-yt-video");
    console.log(`Video container ${index + 1} URL:`, youtubeUrl);

    const youtubeId = extractYouTubeID(youtubeUrl);
    if (!youtubeId) {
      console.error(
        `Video container ${index + 1}: Invalid YouTube URL:`,
        youtubeUrl
      );
      return;
    }

    console.log(`Video container ${index + 1} ID:`, youtubeId);

    // Add necessary classes
    container.classList.add("plyr__video-embed");

    // Set the required Plyr attributes
    container.setAttribute("data-plyr-provider", "youtube");
    container.setAttribute("data-plyr-embed-id", youtubeId);

    // Get thumbnail
    const posterUrl = getYouTubeThumbnail(youtubeId);

    try {
      // Initialize Plyr with enhanced YouTube parameters to prevent related videos
      const player = new Plyr(container, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "fullscreen",
        ],
        youtube: {
          noCookie: true,
          rel: 0, // Prevent related videos
          showinfo: 0,
          modestbranding: 1,
          cc_load_policy: 0, // Hide captions
          hl: "en", // English language UI
          playsinline: 1, // Play inline on mobile
          iv_load_policy: 3, // Hide annotations
          disablekb: 1, // Disable keyboard controls (prevents some shortcuts that could show related)
          origin: window.location.origin,
        },
        poster: posterUrl,
      });

      console.log(
        `Video container ${index + 1}: Player initialized successfully`
      );

      // Add event listeners
      player.on("ready", () => {
        console.log(`Video container ${index + 1}: Player is ready`);
      });

      player.on("error", (error) => {
        console.error(`Video container ${index + 1}: Player error:`, error);
      });

      // Add a pause event listener to ensure no related videos show
      player.on("pause", () => {
        // Additional code to hide any related videos that might appear
        const iframe = container.querySelector("iframe");
        if (iframe) {
          // Force iframe to reload without related videos if needed
          const currentSrc = iframe.src;
          if (currentSrc.indexOf("rel=0") === -1) {
            iframe.src = currentSrc + "&rel=0";
          }
        }
      });
    } catch (error) {
      console.error(
        `Video container ${index + 1}: Error initializing Plyr:`,
        error
      );
    }
  });

  // PART 2: HANDLE IMAGE THUMBNAILS
  // Find all img elements with data-dt-yt-thumbnail attribute
  const thumbnailImages = document.querySelectorAll(
    "img[data-dt-yt-thumbnail]"
  );
  console.log(`Found ${thumbnailImages.length} thumbnail images`);

  thumbnailImages.forEach(function (img, index) {
    const youtubeUrl = img.getAttribute("data-dt-yt-thumbnail");
    console.log(`Thumbnail image ${index + 1} URL:`, youtubeUrl);

    const youtubeId = extractYouTubeID(youtubeUrl);
    if (!youtubeId) {
      console.error(
        `Thumbnail image ${index + 1}: Invalid YouTube URL:`,
        youtubeUrl
      );
      return;
    }

    console.log(`Thumbnail image ${index + 1} ID:`, youtubeId);

    // Create srcset with multiple resolutions
    const thumbnails = {
      default: getYouTubeThumbnail(youtubeId, "default"), // 120x90
      mqdefault: getYouTubeThumbnail(youtubeId, "mqdefault"), // 320x180
      hqdefault: getYouTubeThumbnail(youtubeId, "hqdefault"), // 480x360
      sddefault: getYouTubeThumbnail(youtubeId, "sddefault"), // 640x480
      maxresdefault: getYouTubeThumbnail(youtubeId, "maxresdefault"), // 1280x720
    };

    // Set the src attribute (fallback)
    img.setAttribute("src", thumbnails.maxresdefault);

    // Create srcset for responsive images
    const srcset = `
        ${thumbnails.default} 120w,
        ${thumbnails.mqdefault} 320w,
        ${thumbnails.hqdefault} 480w,
        ${thumbnails.sddefault} 640w,
        ${thumbnails.maxresdefault} 1280w
      `.trim();

    img.setAttribute("srcset", srcset);

    // Add sizes attribute if not present
    if (!img.hasAttribute("sizes")) {
      img.setAttribute("sizes", "(max-width: 768px) 100vw, 50vw");
    }

    // Add alt text if not present
    if (!img.hasAttribute("alt") || img.getAttribute("alt") === "") {
      img.setAttribute("alt", "YouTube video thumbnail");
    }

    console.log(
      `Thumbnail image ${index + 1}: Successfully set thumbnail images`
    );
  });
});

// For Richtext

document.addEventListener("DOMContentLoaded", () => {
  // Target only inside .w-richtext
  const richTextBlocks = document.querySelectorAll(".w-richtext");

  richTextBlocks.forEach((block) => {
    const elements = block.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li");

    elements.forEach((el) => {
      const txt = el.textContent || "";
      // Remove invisible chars: zero-width joiner, spaces, no-break space, etc.
      const cleaned = txt.replace(/[\u200D\u200B\uFEFF\s\u00A0]/g, "");

      if (cleaned === "") {
        el.style.display = "none";
      }
    });
  });
});
