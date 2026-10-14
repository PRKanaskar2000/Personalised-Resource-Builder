// The page block script. It fills every <div data-resource="…"> on the page with the resource image
// and adds a Download button. Each download is reported with the page address it happened on.
//  - data-values='{…}'    values written by the page itself (Funraisin embed)
//  - data-fundraiser="…"  a fundraiser id looked up through the connected platform
const script = `(() => {
  // This script's own address, so it works on any website
  const origin = new URL(document.currentScript.src).origin;

  // Who the page belongs to, for the download list: from data-values, or the data-fundraiser id
  function memberOf(node) {
    try {
      const values = JSON.parse(node.dataset.values || "{}");
      return {
        memberId: values["individual.id"] || node.dataset.fundraiser || "",
        memberName: values["individual.fullName"] || "",
      };
    } catch {
      return {};
    }
  }

  // One "Download" button, centred under the image, that saves the resource as a JPG.
  // It has the class PR_resources_Dbtn and no styles of its own, so the page's CSS decides its look.
  function addDownloadButton(node, img, resourceId) {
    const row = document.createElement("div");
    row.style.marginTop = "8px";
    row.style.textAlign = "center";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "PR_resources_Dbtn";
    button.textContent = "Download";
    button.onclick = () => {
      // Draw the image at full size on white (a JPG has no transparency) and save it
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
      // Count the download against this page and this member
      fetch(origin + "/api/downloads/" + encodeURIComponent(resourceId), {
        method: "POST",
        body: JSON.stringify({ url: location.href, format: "jpg", ...memberOf(node) }),
      }).catch(() => {});
    };
    row.appendChild(button);
    node.appendChild(row);
  }

  document.querySelectorAll("[data-resource]").forEach(async (node) => {
    if (node.dataset.resourceLoaded) return;
    node.dataset.resourceLoaded = "true";

    const resourceId = node.dataset.resource;

    // When the page gives data-values, it must be JSON. If it is empty or broken, show nothing
    // (never the editor's dummy values on a real page) and say why in the browser console.
    const hasValues = node.hasAttribute("data-values");
    if (hasValues) {
      try {
        const sent = JSON.parse(node.dataset.values);
        if (!sent || typeof sent !== "object") throw new Error("not an object");
        // Shows exactly what the page sent: open the browser console (F12) to check a value
        console.info("[Resource embed] values received for " + resourceId + ":", sent);
      } catch {
        console.error(
          "[Resource embed] data-values is empty or not valid JSON, so the resource was not shown. " +
            (node.dataset.values.includes("<?")
              ? "It still contains PHP code: paste the embed code into a PHP template, not an HTML/content block."
              : "Check the PHP that builds $resourceValues."),
          node,
        );
        return;
      }
    }
    const url = origin + "/api/render/" + encodeURIComponent(resourceId);
    const img = document.createElement("img");
    img.alt = "Personalised fundraising resource";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.onload = () => addDownloadButton(node, img, resourceId);

    // A photo path like "/uploads/me.jpg" belongs to this fundraising site, so make it a full address
    let values = hasValues ? node.dataset.values : "";
    if (values) {
      const parsed = JSON.parse(values);
      for (const key in parsed) {
        if (typeof parsed[key] === "string" && /^\\/[^/]/.test(parsed[key])) parsed[key] = location.origin + parsed[key];
      }
      values = JSON.stringify(parsed);
    }

    // With data-values the values go in the request body, so personal details are not put in a URL
    const response = values
      ? await fetch(url, { method: "POST", body: values })
      : await fetch(url + "?fundraiser=" + encodeURIComponent(node.dataset.fundraiser || ""));
    if (!response.ok) return;
    // Shown through a data: address, which is what lets the Download button turn it into a JPG
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(await response.text());
    // The box is only as wide as the image, so the button sits in the middle under the image
    node.style.display = "inline-block";
    node.style.maxWidth = "100%";
    node.appendChild(img);
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
