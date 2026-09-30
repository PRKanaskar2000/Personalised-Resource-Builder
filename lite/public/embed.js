// Page block. Paste into any page:
//   <div data-resource="DESIGN_ID" data-fundraiser="FUNDRAISER_ID"></div>
//   <script src="http://localhost:4000/embed.js"></script>
(() => {
  const base = new URL(document.currentScript.src).origin;
  const loadScript = src => new Promise(done => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = done;
    document.head.append(s);
  });

  (async () => {
    if (!window.Konva) await loadScript('https://cdn.jsdelivr.net/npm/konva@9/konva.min.js');
    await loadScript(base + '/draw.js');

    for (const block of document.querySelectorAll('[data-resource]')) {
      const { resource, fundraiser } = block.dataset;
      const design = await (await fetch(`${base}/api/render/${resource}/${fundraiser}`)).json();

      const canvas = document.createElement('div');
      const button = Object.assign(document.createElement('button'), { textContent: 'Download' });
      block.append(canvas, button);

      const stage = await RB.drawDesign(canvas, design, base);
      RB.fit(stage, design, block.clientWidth || design.width);
      button.onclick = () => RB.download(stage, design.name);
    }
  })();
})();
