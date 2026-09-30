// Editor: create and edit designs. Everything is saved as Design JSON.
const $ = id => document.getElementById(id);
const FIELDS = ['name', 'photo', 'activity', 'supporting', 'goal', 'raised', 'progress', 'team'];
const SIZES = { 'Square post': [1080, 1080], 'Story': [1080, 1920], 'Facebook post': [1200, 630], 'A4 poster': [1240, 1754] };

let design, stage, transformer, selected, previewStage;
let history = [];

const api = (url, method = 'GET', data) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data && JSON.stringify(data) }).then(r => r.json());
const canvasLayer = () => stage.getLayers()[0];
const layerNodes = () => canvasLayer().getChildren(n => n.getAttr('layerType'));

// ---------- Open, save, undo ----------
async function open(d) {
  design = d;
  stage?.destroy();
  stage = await RB.drawDesign($('canvas'), d);
  RB.fit(stage, d, $('canvas').clientWidth, innerHeight - 40);

  transformer = new Konva.Transformer();
  canvasLayer().add(transformer);
  layerNodes().forEach(n => n.draggable(true));
  stage.on('click tap', e => {
    if (e.target.getParent() !== transformer) select(e.target.getAttr('layerType') ? e.target : null);
  });
  stage.on('dragend transformend', snapshot);

  $('name').value = d.name;
  $('w').value = d.width;
  $('h').value = d.height;
  $('bg').value = d.background;
  $('fonts').replaceChildren(...[...RB.FONTS, ...(d.fonts || []).map(f => f.family)].map(f => new Option(f)));
  select(null);
}

// The canvas back to Design JSON: each layer is its Konva attributes + a type
function toJSON() {
  const layers = layerNodes().map(n => {
    const { image, draggable, layerType, ...attrs } = n.getAttrs();
    return { type: layerType, ...attrs };
  });
  return { ...design, name: $('name').value, width: +$('w').value, height: +$('h').value, background: $('bg').value, layers };
}

const snapshot = () => history.push(JSON.stringify(toJSON()));
async function undo() {
  if (history.length < 2) return;
  history.pop();
  await open(JSON.parse(history.at(-1)));
}
async function load(d) {
  history = [];
  await open(d);
  snapshot();
}
async function save() {
  design = toJSON();
  await api('/api/designs/' + design.id, 'PUT', design);
  const list = await api('/api/designs');
  $('designs').replaceChildren(...list.map(d => new Option(d.name, d.id)));
  $('designs').value = design.id;
}
const newDesign = () => ({ id: 'd' + Date.now(), name: 'Untitled', width: 1080, height: 1080, background: '#ffffff', layers: [], fonts: [] });

// ---------- Selecting and editing a layer ----------
function select(node) {
  selected = node;
  transformer.nodes(node ? [node] : []);
  $('props').hidden = !node;
  if (!node) return;
  const type = node.getAttr('layerType');
  document.querySelectorAll('.text').forEach(el => (el.hidden = type !== 'text'));
  document.querySelectorAll('.fill').forEach(el => (el.hidden = type === 'image'));
  document.querySelectorAll('[data-prop]').forEach(input => (input.value = node.getAttr(input.dataset.prop) ?? ''));
}

document.querySelectorAll('[data-prop]').forEach(input => {
  input.oninput = async () => {
    const value = input.type === 'number' ? +input.value : input.value;
    if (input.dataset.prop === 'fontFamily') await document.fonts.load(`40px "${value}"`);
    selected.setAttr(input.dataset.prop, value);
    transformer.forceUpdate();
  };
  input.onchange = snapshot;
});

async function add(layer) {
  const node = await RB.makeNode({ x: 80, y: 80, ...layer });
  node.draggable(true);
  canvasLayer().add(node);
  transformer.moveToTop();
  select(node);
  snapshot();
}

const newText = text => ({ type: 'text', text, fontSize: 64, fontFamily: 'Montserrat', fill: '#1e293b', width: 700 });

async function addImage(src) {
  const img = await RB.loadImage(src);
  const scale = Math.min(1, +$('w').value / 2 / img.width);
  add({ type: 'image', src, width: img.width * scale, height: img.height * scale });
}

// ---------- Uploads (images and fonts) ----------
const readFile = file => new Promise(done => {
  const reader = new FileReader();
  reader.onload = () => done(reader.result);
  reader.readAsDataURL(file);
});
const upload = async file => (await api('/api/assets', 'POST', { name: file.name, dataUrl: await readFile(file) })).url;

async function listAssets() {
  const images = (await api('/api/assets')).filter(url => /\.(png|jpe?g|gif|webp|svg)$/i.test(url));
  $('assets').replaceChildren(...images.map(src => Object.assign(new Image(), { src, title: 'Add to design', onclick: () => addImage(src) })));
}

// ---------- Buttons ----------
$('new').onclick = () => load(newDesign());
$('designs').onchange = async e => load(await api('/api/designs/' + e.target.value));
$('save').onclick = save;
$('undo').onclick = undo;
$('download').onclick = () => { select(null); RB.download(stage, $('name').value); };

$('preset').onchange = async e => {
  [$('w').value, $('h').value] = SIZES[e.target.value];
  e.target.value = '';
  await open(toJSON());
  snapshot();
};
['w', 'h', 'bg'].forEach(id => ($(id).onchange = async () => { await open(toJSON()); snapshot(); }));

$('addText').onclick = () => add(newText('Your text'));
$('addRect').onclick = () => add({ type: 'rect', width: 400, height: 250, fill: '#f59e0b', cornerRadius: 16 });
$('field').onchange = e => {
  const field = e.target.value;
  e.target.value = '';
  if (field === 'photo') add({ type: 'image', src: '{{photo}}', width: 300, height: 300, cornerRadius: 150 });
  else add(newText(`{{${field}}}`));
};

$('upImage').onchange = async e => {
  addImage(await upload(e.target.files[0]));
  listAssets();
};
$('upFont').onchange = async e => {
  const file = e.target.files[0];
  const url = await upload(file);
  const family = file.name.replace(/\.\w+$/, '');
  document.fonts.add(await new FontFace(family, `url(${url})`).load());
  design.fonts = [...(design.fonts || []), { family, url }];
  $('fonts').add(new Option(family));
};

$('forward').onclick = () => { selected.moveUp(); transformer.moveToTop(); snapshot(); };
$('back').onclick = () => { if (selected.zIndex() > 1) selected.moveDown(); snapshot(); }; // index 0 is the background
$('delete').onclick = () => { selected?.destroy(); select(null); snapshot(); };

addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'Delete') $('delete').click();
  if (e.ctrlKey && e.key === 'z') undo();
});

// Preview: save, then ask the server to personalise the design for one fundraiser
$('preview').onclick = async () => {
  await save();
  const fundraiser = $('fundraiser').value;
  const personalised = await api(`/api/render/${design.id}/${fundraiser}`);
  previewStage?.destroy();
  previewStage = await RB.drawDesign($('preview-box'), personalised);
  RB.fit(previewStage, personalised, $('preview-box').clientWidth);
  $('download-preview').hidden = false;
  $('embed').value = `<div data-resource="${design.id}" data-fundraiser="${fundraiser}"></div>\n<script src="${location.origin}/embed.js"></script>`;
};
$('download-preview').onclick = () => RB.download(previewStage, `${$('name').value}-${$('fundraiser').value}`);

// ---------- Start ----------
(async () => {
  $('preset').append(...Object.keys(SIZES).map(s => new Option(s)));
  $('field').append(...FIELDS.map(f => new Option(f)));
  $('fundraiser').replaceChildren(...(await api('/api/fundraisers')).map(f => new Option(f.name, f.id)));
  const list = await api('/api/designs');
  $('designs').replaceChildren(...list.map(d => new Option(d.name, d.id)));
  await load(list.length ? await api('/api/designs/' + list[0].id) : newDesign());
  listAssets();
})();
