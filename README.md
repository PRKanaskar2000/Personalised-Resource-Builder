# Personalised Resource Builder

Fundraising-focused resource studio: design a template once, personalise it from connected fundraiser data, then download or embed it.

This follows the architecture in *Personalised Resource Builder Architecture*:

1. Resource Builder (canvas editor)
2. Normalised data model + dynamic field registry
3. Resource / template JSON (never flattened images as the source of truth)
4. Connector abstraction (demo API first)
5. Personalisation + rendering engine
6. SVG / PNG export and embed delivery

## Run

Requires Node.js 20+. From this folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What you can do

- Edit the seeded **City Challenge poster**
- Switch live preview between **Peter, Alex, Alan, Richi**
- Add locked/hidden layers, dynamic text (`I am {{activity.type}} for {{relationship.supporting}}`), photos, and progress
- Save Design JSON (with version snapshots) under `data/`
- Preview all four dummy users on one page
- Export SVG, download PNG, or embed:

```html
<div data-resource="resource_challenge_poster" data-fundraiser="peter"></div>
<script src="http://localhost:3000/embed.js"></script>
```

Image fallback URL:

`/api/render/resource_challenge_poster?fundraiser=peter`

or `/r/resource_challenge_poster/peter`

## Next steps from the architecture plan

- Real OAuth connector (e.g. Raisely) mapped into the same normalised schema
- Object storage / CDN for assets
- Server-side PNG/PDF via a dedicated renderer
- Permissions, org branding, and production deploy
