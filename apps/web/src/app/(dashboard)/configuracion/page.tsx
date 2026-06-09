import { redirect } from 'next/navigation';

/**
 * Spanish-URL alias for the canonical English `/settings` page.
 *
 * The sidebar uses `/settings` as canonical href. This file exists solely
 * to prevent 404 when users type the Spanish URL (bookmarks, manual typing,
 * legacy links). Server Component so the redirect happens before any client
 * bundle is shipped.
 */
export default function ConfiguracionIndex() {
  redirect('/settings');
}
