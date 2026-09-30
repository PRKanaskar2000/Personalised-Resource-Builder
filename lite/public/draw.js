// Shared renderer: turns Design JSON into a Konva canvas.
// The editor, the preview and the page block all use this one file,
// so what you design is exactly what people see and download.
const RB = (() => {
  const FONTS = ['Montserrat', 'Roboto', 'Lato', 'Playfair Display', 'Bebas Neue', 'Pacifico'];

  async function loadFonts(design, base) {
    if (!document.getElementById('rb-fonts')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'rb-fonts',
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?' + FONTS.map(f => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap',
      });
      await new Promise(done => { link.onload = link.onerror = done; document.head.append(link); });
    }
    for (const f of design.fonts || []) {
      try { document.fonts.add(await new FontFace(f.family, `url(${base + f.url})`).load()); } catch {}
    }
    const texts = design.layers.filter(l => l.type === 'text');
    await Promise.all(texts.map(l => document.fonts.load(`${l.fontSize}px "${l.fontFamily}"`)));
  }

  function loadImage(src, base = '') {
    if (src.includes('{{')) src = '/avatar/Photo'; // dynamic photo placeholder in the editor
    return new Promise(done => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // keeps the canvas downloadable
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = src.startsWith('/') ? base + src : src;
    });
  }

  // One design layer = Konva attributes + a type ("text", "rect" or "image")
  async function makeNode({ type, ...attrs }, base = '') {
    if (type === 'text') return new Konva.Text({ ...attrs, layerType: type });
    if (type === 'rect') return new Konva.Rect({ ...attrs, layerType: type });
    if (type === 'image') return new Konva.Image({ ...attrs, layerType: type, image: await loadImage(attrs.src, base) });
  }

  async function drawDesign(container, design, base = '') {
    await loadFonts(design, base);
    const stage = new Konva.Stage({ container, width: design.width, height: design.height });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ width: design.width, height: design.height, fill: design.background, listening: false }));
    for (const l of design.layers) {
      const node = await makeNode(l, base);
      if (node) layer.add(node);
    }
    return stage;
  }

  // Shrink the canvas to fit on screen (the design itself keeps its real size)
  function fit(stage, design, maxW, maxH = Infinity) {
    const s = Math.min(1, maxW / design.width, maxH / design.height);
    stage.size({ width: design.width * s, height: design.height * s });
    stage.scale({ x: s, y: s });
  }

  // Download at full size, whatever size it is shown at
  function download(stage, name = 'resource') {
    const a = document.createElement('a');
    a.href = stage.toDataURL({ pixelRatio: 1 / stage.scaleX() });
    a.download = name + '.png';
    a.click();
  }

  return { FONTS, drawDesign, makeNode, loadImage, fit, download };
})();
