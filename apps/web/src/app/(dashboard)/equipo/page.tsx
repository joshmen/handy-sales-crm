import { redirect } from 'next/navigation';

/**
 * Spanish-URL alias for the canonical English `/team` page.
 *
 * The sidebar uses `/team` as canonical href. This file exists solely
 * to prevent 404 when users type the Spanish URL (bookmarks, manual typing,
 * legacy links). Server Component so the redirect happens before any client
 * bundle is shipped.
 */
export default function EquipoIndex() {
  redirect('/team');
}
