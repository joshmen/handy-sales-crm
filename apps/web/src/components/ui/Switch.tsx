import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked)
      props.onChange?.(event)
    }

    return (
      <label className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}>
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-surface-3 transition-colors",
            "peer-disabled:opacity-50"
          )}
          style={checked ? { backgroundColor: 'var(--company-primary-color, #16a34a)' } : undefined}
        />
        <span className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center",
          "peer-checked:translate-x-5"
        )}>
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-current" style={{ color: 'var(--company-primary-color, #16a34a)' }}>
              <path d="M8.5 2.5L3.75 7.5L1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </label>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }