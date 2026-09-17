# KOJOH Admin Portal

Back office for the KOJOH dataset marketplace. Separate deployment, separate
repo, same Supabase project as the public site.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Dashboard: earnings, users, active users, licenses, signups and sales per day, and the preference panels |
| `content.html` | Folders and datasets: create, edit, set folder colour, hide or publish in one click |
| `editor.html?id=` | Full dataset editor: story, columns, data files, images, SEO |
| `inbox.html` | Suggestions, app feedback, and what people typed into search |

## Security

Both sites ship the same public anon key, so the URL is not the gate. Access is
decided by `profiles.is_admin` and the row level security policies created in
`admin-schema.sql`. A signed in non admin sees a "no access" screen, and every
write they could attempt is refused by the database itself.

## Setup

1. Run `admin-schema.sql` in the Supabase SQL editor.
2. Make sure the last statement in that file set `is_admin` on your profile.
3. Deploy this folder as its own Vercel project.
4. Sign in with your KOJOH account.

## Notes

- The dataset editor reads the CSV in your browser to rebuild the public five row
  preview and the column list. The file itself never leaves Supabase.
- Images go to a public `images` bucket. Data files stay in the private
  `datasets` bucket, reachable only by buyers.
- Hiding a dataset takes it off the catalogue but buyers keep access to anything
  they already paid for.
