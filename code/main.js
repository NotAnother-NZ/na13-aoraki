document.addEventListener("DOMContentLoaded", function () {
  var noscripts = document.querySelectorAll("noscript");
  noscripts.forEach(function (el) {
    el.parentNode.removeChild(el);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const menuLinks = document.querySelectorAll("a[menuitem]");
    const menuImages = document.querySelectorAll("img[imgitem]");

    function showDefaultImage() {
      menuImages.forEach((img) => img.classList.remove("show", "default"));
      const currentLink = document.querySelector("a[menuitem].w--current");
      if (currentLink) {
        const menuitem = currentLink.getAttribute("menuitem");
        const currentImg = document.querySelector(`img[imgitem="${menuitem}"]`);
        if (currentImg) currentImg.classList.add("default");
      }
    }

    showDefaultImage();

    menuLinks.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        menuImages.forEach((img) => img.classList.remove("show", "default"));
        const menuitem = link.getAttribute("menuitem");
        const img = document.querySelector(`img[imgitem="${menuitem}"]`);
        if (img) img.classList.add("show");
      });
      link.addEventListener("mouseleave", () => {
        showDefaultImage();
      });
    });
  }, 1000);
});

// add bg color on navbar when user scrolldown
document.addEventListener("DOMContentLoaded", () => {
  // Function to add/remove class based on scroll position
  const handleScroll = () => {
    if (window.scrollY > 100) {
      document.body.classList.add("nav-bg");
    } else {
      document.body.classList.remove("nav-bg");
    }
  };

  // Initial scroll check
  handleScroll();

  // Listen for scroll events
  window.addEventListener("scroll", handleScroll);
});

document.addEventListener("DOMContentLoaded", function () {
  function addClickListeners() {
    var navMenuLinks = document.querySelectorAll("[navbar] .w-nav-menu a");
    var closeButton = document.querySelector("[nav-menu-btn]");

    // Prevent adding duplicate listeners
    navMenuLinks.forEach(function (link) {
      link.removeEventListener("click", handleClick); // remove existing
      link.addEventListener("click", handleClick); // add new
    });

    function handleClick() {
      if (closeButton) closeButton.click();
    }
  }

  addClickListeners();

  // Reattach on resize (optional, in case elements change)
  window.addEventListener("resize", addClickListeners);
});

// Script For FAQ
const initAccordion = () => {
  const accGroups = document.querySelectorAll("[acc-group]");

  accGroups.forEach((group) => {
    const heads = group.querySelectorAll("[acc-head]");

    heads.forEach((head) => {
      const content = head.nextElementSibling;
      content.style.cssText = "height:0;overflow:hidden;transition:height 0.3s";

      head.addEventListener("click", () => {
        heads.forEach((h) => {
          if (h !== head) {
            h.classList.remove("open");
            h.nextElementSibling.style.height = "0px";
          }
        });

        const isOpen = head.classList.toggle("open");
        content.style.height = isOpen ? content.scrollHeight + "px" : "0px";
      });
    });

    // âœ… Auto-open first item in each group
    heads[0]?.click();
  });
};

// âœ… Run initial accordion
initAccordion();

// announcement bar hide js
const announcementbars = document.querySelectorAll("[announcementbar]");
if (announcementbars.length > 0) {
  document.querySelectorAll("[announcementclose]").forEach(function (closeBtn) {
    closeBtn.addEventListener("click", function () {
      announcementbars.forEach(function (announcementbar) {
        announcementbar.style.height = "0px"; // collapse bar
      });
    });
  });
}
