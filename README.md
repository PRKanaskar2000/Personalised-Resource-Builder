# Personalised Resource Builder

Design a fundraising resource once, personalise it for every fundraiser, then download it or embed it on a fundraising page.

## Run

Requires Node.js 20+. From this folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

### First-time setup

1. Create a file named `.env.local` in this folder with:

   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your service_role key
   ADMIN_USERNAME=choose a username
   ADMIN_PASSWORD=choose a strong password
   SESSION_SECRET=a long random text (40+ characters)
   ```

2. In Supabase, open **SQL Editor**, paste `supabase/schema.sql` and run it. It creates the tables.

`.env.local` is never uploaded to Git. Keep the service_role key secret: it has full access to the database.

## Who sees what

- **Admin** (the login in `.env.local`): creates clients and can open every client.
- **Client**: logs in with their own username and password, and sees only their own **events**.
- **Event**: a folder holding its own resources, uploaded images, settings and download history.

The only things open without logging in are what a fundraising page needs: the embed script,
the finished image of a resource, and reporting a download.

## What you can do

- **Home page:** see every resource as its finished image; hover one to open the editor.
- **Editor:** add text, dynamic text, user photos, shapes, circles, progress bars and uploaded images.
  Move and resize with the handles, set fonts, colours, borders and corner radius, style individual words,
  centre layers, and undo with Ctrl+Z.
- **Dynamic fields:** write `I am {{activity.type}} for {{relationship.supporting}}`. Custom fields are written
  `{{custom.field_name}}`.
- **Download:** PNG, JPG, JPEG or PDF.
- **Embed:** copy the Funraisin (or Raisely) embed code from the editor. Downloads are counted per page and member.

## How the code is organised

| Folder / file | What it holds |
| --- | --- |
| `src/app/login/page.tsx` | Login page |
| `src/app/page.tsx` | Admin: the list of clients |
| `src/app/clients/[id]/page.tsx` | A client's events, shown as folders |
| `src/app/events/[id]/page.tsx` | An event: its resources and settings |
| `src/app/editor/[id]/page.tsx` | Editor page |
| `src/app/api/` | Backend: `login`, `clients`, `events`, `resources`, `assets` (uploads), `render` (finished image), `downloads` |
| `src/lib/auth.ts` | Passwords and login sessions |
| `src/lib/access.ts` | The one place that decides who may open what |
| `src/lib/supabase.ts` | Connection to the Supabase database and storage |
| `src/app/embed.js/route.ts` | The script a fundraising page loads to show a resource |
| `src/components/` | `EditorShell` (the editor), `ResourceCanvas` (draws a design), `NewResourceButton` |
| `src/lib/types.ts` | The shape of a design, a layer and a fundraiser |
| `src/lib/design.ts` | The default design for new resources, and default layers |
| `src/lib/field-registry.ts` | Every dynamic field and its Funraisin variable |
| `src/lib/embed-code.ts` | Builds the embed code from the fields a design uses |
| `src/lib/fonts.ts` | The fonts a design can use |
| `src/lib/personalisation.ts` | Fills `{{fields}}` with a fundraiser's values |
| `src/lib/render/` | Turns a design into the finished image (same layout as the editor) |
| `src/lib/connectors/` | Where preview data comes from (one dummy fundraiser for now) |
| `src/lib/store.ts` | Reads and writes clients, events, resources, images and downloads in Supabase |

## Embed

```html
<div data-resource="RESOURCE_ID" data-values='{"individual.fullName":"Peter Walsh"}'></div>
<script src="http://localhost:3000/embed.js"></script>
```

On Funraisin the editor gives you PHP that fills `data-values` from the page's own variables.
The app must be on a public https address for an embed to work on a live site; `localhost` only works on your own computer.

## Not done yet

- Hosting on a public address (https)
- Raisely variables for the embed code
