// Personalisation: fill {{field}} placeholders in a design with one fundraiser's data.
// A layer whose field has no value is hidden (e.g. "Team {{team}}" for someone with no team).

const money = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: process.env.CURRENCY || 'GBP', maximumFractionDigits: 0 }).format(n);
const FIELD = /{{\s*(\w+)\s*}}/g;

module.exports = function personalise(design, data) {
  const values = {
    ...data,
    goal: data.goal != null ? money(data.goal) : '',
    raised: data.raised != null ? money(data.raised) : '',
    progress: data.goal ? Math.round((data.raised / data.goal) * 100) + '%' : '',
    // External photos go through our proxy so the canvas can still be downloaded
    photo: /^https?:/.test(data.photo || '') ? '/api/proxy?url=' + encodeURIComponent(data.photo) : data.photo,
  };
  const missing = s => [...(s || '').matchAll(FIELD)].some(([, key]) => !values[key]);
  const fill = s => s && s.replace(FIELD, (_, key) => values[key]);

  const layers = design.layers
    .filter(l => !missing(l.text) && !missing(l.src))
    .map(l => ({ ...l, text: fill(l.text), src: fill(l.src) }));

  return { ...design, layers };
};
