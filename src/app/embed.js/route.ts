// The page block script. It fills every embed on a fundraising page:
//   <div data-resource="ID">                         one post
//   <div data-slider="ID,ID,ID" data-columns="2">    several posts in a slider, 1 to 4 side by side
//        data-nav="arrows" or "dots"                 only those controls (both when missing)
//        data-arrow-icon="https://…/arrow.png"       an image inside the arrows instead of ‹ ›
//        style="--pr-arrow-bg:#e5007e;…"            the look of arrows and dots (see slider-style.ts)
// with these optional attributes:
//   data-values='{…}'    values written by the page itself (Funraisin embed)
//   data-fundraiser="…"  a fundraiser id looked up through the connected platform
// A post whose conditional logic does not match the member is left out.
// Each post gets one "Download" button (class PR_resources_Dbtn) that saves a JPG; each download is
// reported with the page it happened on. Slider parts have classes too (PR_slider, PR_slider_prev,
// PR_slider_next, PR_slider_dots), so the page's own CSS can change their look.
const script = `(() => {
  // This script's own address, so it works on any website
  const origin = new URL(document.currentScript.src).origin;
  // This page's address without ?query or #hash
  const page = location.origin + location.pathname;

  // The values the page wrote in data-values: an object, null when there are none,
  // or false when they are broken (then nothing is shown: never the editor's dummy values on a real page)
  function valuesOf(node) {
    if (!node.hasAttribute("data-values")) return null;
    try {
      const values = JSON.parse(node.dataset.values);
      if (!values || typeof values !== "object") throw new Error("not an object");
      // Shows exactly what the page sent: open the browser console (F12) to check a value
      console.info("[Resource embed] values received:", values);
      // A photo path like "/uploads/me.jpg" belongs to this fundraising site, so make it a full address
      for (const key in values) {
        if (typeof values[key] === "string" && /^\\/[^/]/.test(values[key])) values[key] = location.origin + values[key];
      }
      return values;
    } catch {
      console.error(
        "[Resource embed] data-values is empty or not valid JSON, so nothing was shown. " +
          (node.dataset.values.includes("<?")
            ? "It still contains PHP code: paste the embed code into a PHP template, not an HTML/content block."
            : "Check the PHP that builds $resourceValues."),
        node,
      );
      return false;
    }
  }

  // Who the page belongs to, for the download list
  function memberOf(node, values) {
    return {
      memberId: (values && values["individual.id"]) || node.dataset.fundraiser || "",
      memberName: (values && values["individual.fullName"]) || "",
    };
  }

  // One post, personalised. Null when it is hidden by its conditional logic (or cannot be loaded).
  async function loadPost(id, node, values) {
    const body = values ? { values, page } : { fundraiser: node.dataset.fundraiser || "", page };
    try {
      const response = await fetch(origin + "/api/render/" + encodeURIComponent(id) + "?embed=1", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      const post = await response.json();
      return post.show ? { id, svg: post.svg, button: post.button } : null;
    } catch {
      return null;
    }
  }

  function loadFont(url) {
    if (!url || document.querySelector('link[href="' + url + '"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }

  // Draw the image at full size on white (a JPG has no transparency), save it, and report the download
  function download(img, resourceId, member) {
    if (!img.naturalWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "resource.jpg";
      link.click();
    }, "image/jpeg", 0.92);
    fetch(origin + "/api/downloads/" + encodeURIComponent(resourceId), {
      method: "POST",
      body: JSON.stringify({ url: location.href, format: "jpg", ...member }),
    }).catch(() => {});
  }

  // A post: its image, with the Download button centred under it
  function postElement(post, member) {
    const box = document.createElement("div");
    box.className = "PR_resources_post";
    const img = document.createElement("img");
    img.alt = "Personalised fundraising resource";
    img.style.cssText = "display:block;max-width:100%;height:auto;margin:0 auto";
    // Shown through a data: address, which is what lets the Download button turn it into a JPG
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(post.svg);
    const row = document.createElement("div");
    row.style.cssText = "margin-top:8px;text-align:center";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "PR_resources_Dbtn";
    // Styled in the builder, or left to the page's CSS
    button.textContent = (post.button && post.button.text) || "Download";
    if (post.button) {
      Object.assign(button.style, post.button.css);
      loadFont(post.button.fontUrl);
    }
    button.onclick = () => download(img, post.id, member);
    row.appendChild(button);
    box.append(img, row);
    return box;
  }

  async function showPost(node, values) {
    const post = await loadPost(node.dataset.resource, node, values);
    if (!post) return;
    // The box is only as wide as the image, so the button sits in the middle under the image
    node.style.display = "inline-block";
    node.style.maxWidth = "100%";
    node.appendChild(postElement(post, memberOf(node, values)));
  }

  // Default slider styles, added first in <head> so the page's own CSS can override them
  function addSliderStyles() {
    if (document.getElementById("PR_slider_styles")) return;
    const style = document.createElement("style");
    style.id = "PR_slider_styles";
    style.textContent =
      // Arrows sit outside the posts: [prev] [posts] [next], with the dots in a row underneath
      ".PR_slider{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;max-width:100%}" +
      ".PR_slider_track{grid-column:2;grid-row:1;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none}" +
      ".PR_slider_track::-webkit-scrollbar{display:none}" +
      ".PR_slider_item{flex:0 0 calc((100% - (var(--pr-columns,1) - 1) * 16px) / var(--pr-columns,1));min-width:0;scroll-snap-align:start}" +
      ".PR_slider_prev,.PR_slider_next{grid-row:1;display:flex;align-items:center;justify-content:center;width:var(--pr-arrow-size,40px);height:var(--pr-arrow-size,40px);padding:0;border:0;border-radius:var(--pr-arrow-radius,50%);background:var(--pr-arrow-bg,#555555);color:var(--pr-arrow-color,#ffffff);font-size:calc(var(--pr-arrow-size,40px) * .6);line-height:1;cursor:pointer}" +
      ".PR_slider_prev{grid-column:1;margin-right:12px}.PR_slider_next{grid-column:3;margin-left:12px}" +
      ".PR_slider_dots{grid-column:1/-1;display:flex;justify-content:center;gap:8px;margin-top:12px}" +
      ".PR_slider_dots button{width:var(--pr-dot-size,10px);height:var(--pr-dot-size,10px);padding:0;border:0;border-radius:50%;background:var(--pr-dot,#cccccc);cursor:pointer}" +
      ".PR_slider_dots button.PR_active{background:var(--pr-dot-active,#333333)}";
    document.head.prepend(style);
  }

  async function showSlider(node, values) {
    const ids = node.dataset.slider.split(",").map((id) => id.trim()).filter(Boolean);
    const columns = Math.min(4, Math.max(1, parseInt(node.dataset.columns, 10) || 1));
    // Load every post at once; keep the ones the member should see, in the chosen order
    const posts = (await Promise.all(ids.map((id) => loadPost(id, node, values)))).filter(Boolean);
    if (posts.length === 0) return;
    addSliderStyles();

    const member = memberOf(node, values);
    const slider = document.createElement("div");
    slider.className = "PR_slider";
    const track = document.createElement("div");
    track.className = "PR_slider_track";
    for (const post of posts) {
      const item = document.createElement("div");
      item.className = "PR_slider_item";
      item.appendChild(postElement(post, member));
      track.appendChild(item);
    }
    // An arrow button: the chosen icon image (pointing right; flipped for "previous"), or ‹ ›
    const arrow = (className, label, text) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.setAttribute("aria-label", label);
      if (node.dataset.arrowIcon) {
        const icon = document.createElement("img");
        icon.src = node.dataset.arrowIcon;
        icon.alt = "";
        icon.style.cssText =
          "width:var(--pr-arrow-icon-size,20px);height:var(--pr-arrow-icon-size,20px);object-fit:contain" +
          (className === "PR_slider_prev" ? ";transform:scaleX(-1)" : "");
        button.appendChild(icon);
      } else {
        button.textContent = text;
      }
      return button;
    };
    const prev = arrow("PR_slider_prev", "Previous", "\\u2039");
    const next = arrow("PR_slider_next", "Next", "\\u203A");
    const dots = document.createElement("div");
    dots.className = "PR_slider_dots";
    slider.append(prev, track, next, dots);
    node.appendChild(slider);

    // One "page" is one screen of posts; the gap between posts is 16px
    const pageWidth = () => track.clientWidth + 16;
    // Scrolled to the end = the last page (the last page may hold fewer posts than a full screen)
    const currentPage = () =>
      track.scrollLeft >= track.scrollWidth - track.clientWidth - 2
        ? dots.children.length - 1
        : Math.round(track.scrollLeft / pageWidth());
    prev.onclick = () => track.scrollBy({ left: -pageWidth() });
    next.onclick = () => track.scrollBy({ left: pageWidth() });

    function markDot() {
      [...dots.children].forEach((dot, index) => dot.classList.toggle("PR_active", index === currentPage()));
    }
    // How many posts fit side by side: fewer on small screens. Arrows and dots only when there is more to see.
    function layout() {
      const width = slider.clientWidth;
      const shown = Math.min(posts.length, width < 600 ? 1 : width < 900 ? Math.min(columns, 2) : columns);
      slider.style.setProperty("--pr-columns", shown);
      const pages = Math.ceil(posts.length / shown);
      dots.replaceChildren(
        ...Array.from({ length: pages }, (_, index) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("aria-label", "Show page " + (index + 1));
          dot.onclick = () => track.scrollTo({ left: index * pageWidth() });
          return dot;
        }),
      );
      // Controls only when there is more to see, and only the ones chosen (data-nav)
      const more = pages > 1;
      const nav = node.dataset.nav || "both";
      prev.style.display = next.style.display = more && nav !== "dots" ? "" : "none";
      dots.style.display = more && nav !== "arrows" ? "" : "none";
      markDot();
    }
    track.addEventListener("scroll", markDot, { passive: true });
    window.addEventListener("resize", layout);
    layout();
  }

  document.querySelectorAll("[data-resource], [data-slider]").forEach((node) => {
    if (node.dataset.resourceLoaded) return;
    node.dataset.resourceLoaded = "true";
    const values = valuesOf(node);
    if (values === false) return;
    if (node.dataset.slider) showSlider(node, values);
    else showPost(node, values);
  });
})();`;

export function GET() {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
