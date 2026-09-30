const script = `(() => {
  const nodes = document.querySelectorAll("[data-resource]");
  nodes.forEach((node) => {
    const resource = node.getAttribute("data-resource");
    const fundraiser = node.getAttribute("data-fundraiser") || "peter";
    const img = document.createElement("img");
    img.alt = "Personalised fundraising resource";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.src = "/api/render/" + resource + "?fundraiser=" + encodeURIComponent(fundraiser);
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
