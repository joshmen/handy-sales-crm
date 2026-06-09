import { redirect } from 'next/navigation';

/**
 * Spanish-URL alias for the canonical English `/routes` page.
 *
 * The sidebar and product navigation use `/routes` (see Sidebar.tsx, item id `routes-list`).
 * This file exists solely to keep direct hits to `/rutas` (bookmarks, legacy links, manual
 * URL typing) from returning a 404. It is intentionally a Server Component (no `'use client'`)
 * so the redirect happens on the server before any client bundle is shipped.
 */
export default function RutasIndex() {
  redirect('/routes');
}
