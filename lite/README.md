# Resource Builder (lite)

Design a fundraising resource once, personalise it for every fundraiser, show it on any page and let people download it.

## Run

Needs [Node.js](https://nodejs.org) 18 or newer. There are no packages to install.

```bash
node server.js
```

- Editor: http://localhost:4000
- Demo page with the block: http://localhost:4000/demo.html

## How it works

| File | Job |
| --- | --- |
| `server.js` | Saves designs and assets, serves the API and pages |
| `connectors.js` | Gets fundraiser data (dummy data now, Raisely when `RAISELY_API_KEY` is set) and maps it to our field names |
| `personalise.js` | Fills `{{name}}`, `{{raised}}`, etc. and hides layers whose data is missing |
| `public/draw.js` | Draws Design JSON with Konva. The editor, the preview and the page block all use it |
| `public/editor.js` | The editor: sizes, text, images, shapes, fonts, colours, assets, undo, save |
| `public/embed.js` | The page block: draws a personalised design and adds a Download button |
| `data/designs/*.json` | Saved designs |

Dynamic fields: `name`, `photo`, `activity`, `supporting`, `goal`, `raised`, `progress`, `team`.
Use them in any text, like `I'm {{activity}} for {{supporting}}`.

## Page block

```html
<div data-resource="sample" data-fundraiser="peter"></div>
<script src="http://localhost:4000/embed.js"></script>
```

## Real fundraising data (Raisely)

```bash
set RAISELY_API_KEY=your-key
set RAISELY_CAMPAIGN=your-campaign-uuid
node server.js
```
