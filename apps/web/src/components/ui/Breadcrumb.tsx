import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" aria-hidden="true" />}
            {isLast ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : item.onClick ? (
              <button onClick={item.onClick} className="text-muted-foreground hover:text-foreground hover:underline">
                {item.label}
              </button>
            ) : item.href ? (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
