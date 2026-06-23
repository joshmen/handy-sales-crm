import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-elevation-1 hover:shadow-elevation-2 hover:brightness-110",
        destructive:
          "bg-gradient-to-b from-destructive to-destructive/85 text-destructive-foreground shadow-elevation-1 hover:shadow-elevation-2 hover:brightness-110",
        outline:
          "border border-border-subtle bg-surface-2 hover:bg-surface-3 hover:border-border-strong hover:shadow-elevation-1 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-elevation-1",
        ghost: "hover:bg-surface-3 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-gradient-to-b from-success to-success/85 text-success-foreground shadow-elevation-1 hover:shadow-elevation-2 hover:brightness-110",
        // SLDS pill variants (rediseño visual): radio alto, estilo plano.
        wbPrimary: "rounded-full bg-primary text-primary-foreground shadow-elevation-1 hover:bg-primary/90",
        wbOutline: "rounded-full bg-card text-foreground border border-border-strong hover:bg-surface-2",
        wbSoft: "rounded-full bg-surface-2 text-foreground border border-border-subtle hover:bg-surface-3",
        wbGhost: "rounded-full bg-surface-2 text-foreground hover:bg-surface-3",
        wbDanger: "rounded-full bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        // NOTE: sm/lg intentionally omit `rounded-*` so the variant's radius wins
        // (base provides rounded-md for non-wb variants; wb* variants keep rounded-full).
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size="sm" className="-ml-1 mr-2" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
