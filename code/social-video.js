document.addEventListener("DOMContentLoaded", () => {
  const mediaContainers = document.querySelectorAll(".instagram-post-media");

  function getYouTubeIdAndType(url) {
    if (!url) return { id: null, isShort: false };

    // Check if it is a short
    const isShort = url.includes("shorts/");

    // Regex to extract ID (works for both standard and shorts)
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : null;

    return { id, isShort };
  }

  mediaContainers.forEach((container, index) => {
    const videoElement = container.querySelector("video");
    const sourceElement = container.querySelector("source");

    if (!videoElement || !sourceElement) return;

    const src = sourceElement.getAttribute("src");
    const { id, isShort } = getYouTubeIdAndType(src);

    if (id) {
      const uniquePlayerId = `player-youtube-${index}`;
      const plyrContainer = document.createElement("div");

      plyrContainer.id = uniquePlayerId;
      plyrContainer.classList.add("plyr__video-embed");

      // 1. ADD THE SPECIAL CLASS HERE IF IT IS A SHORT
      if (isShort) {
        plyrContainer.classList.add("is-short");
      }

      plyrContainer.style.pointerEvents = "none";

      plyrContainer.setAttribute("data-plyr-provider", "youtube");
      plyrContainer.setAttribute("data-plyr-embed-id", id);

      container.replaceChild(plyrContainer, videoElement);

      const player = new Plyr(`#${uniquePlayerId}`, {
        autoplay: true,
        muted: true,
        loop: { active: true },
        controls: [],
        clickToPlay: false,
        ratio: isShort ? "9:16" : "16:9", // Hint aspect ratio to Plyr
        youtube: {
          noCookie: true,
          rel: 0,
          showinfo: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
        },
      });

      player.on("ready", () => {
        player.muted = true;
        player.play();
      });
    }
  });
});
