import * as React from "react"
import { cn } from "@/lib/utils"

const Select = ({ children, value, onValueChange }: {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, { 
              value, 
              onValueChange, 
              onClick: () => setIsOpen(!isOpen),
              isOpen 
            } as any)
          }
          if (child.type === SelectContent) {
            return isOpen ? React.cloneElement(child, { 
              value, 
              onValueChange: (newValue: string) => {
                onValueChange?.(newValue)
                setIsOpen(false)
              }
            } as any) : null
          }
        }
        return child
      })}
    </div>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { 
    value?: string; 
    onValueChange?: (value: string) => void;
    isOpen?: boolean;
  }
>(({ className, children, value, onValueChange, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <svg
      className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, value }: { placeholder?: string; value?: string }) => (
  <span className={value ? "text-foreground" : "text-muted-foreground"}>
    {value || placeholder}
  </span>
)

const SelectContent = ({ children, onValueChange }: { 
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}) => (
  <div className="absolute top-full left-0 z-50 min-w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md mt-1">
    {React.Children.map(children, child =>
      React.isValidElement(child) 
        ? React.cloneElement(child, { onValueChange } as any)
        : child
    )}
  </div>
)

const SelectItem = ({ value, children, onValueChange }: {
  value: string
  children: React.ReactNode
  onValueChange?: (value: string) => void
}) => (
  <div
    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
    onClick={() => onValueChange?.(value)}
  >
    {children}
  </div>
)

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } 