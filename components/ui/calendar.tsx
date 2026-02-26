'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const CURRENT_YEAR = new Date().getFullYear()

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      startMonth={new Date(2010, 0)}
      endMonth={new Date(CURRENT_YEAR + 2, 11)}
      className={cn('p-3 select-none', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'flex flex-col gap-3',
        month_caption: 'relative flex h-9 w-full items-center justify-center',
        caption_label: 'hidden',
        // nav en flujo normal — solo los botones tienen absolute respecto a month_caption
        nav: 'flex',
        button_previous: cn(
          'absolute left-1 h-7 w-7 rounded-md inline-flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ),
        button_next: cn(
          'absolute right-1 h-7 w-7 rounded-md inline-flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ),
        dropdowns: 'flex items-center gap-1',
        dropdown_root: 'relative',
        dropdown: cn(
          'appearance-none h-7 rounded-md border border-input bg-background',
          'pl-2 pr-6 text-sm font-semibold text-foreground capitalize',
          'cursor-pointer hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 h-7 text-[0.7rem] text-muted-foreground flex items-center justify-center font-medium uppercase',
        week: 'flex w-full mt-1',
        day: 'relative h-9 w-9 p-0 text-center',
        day_button: cn(
          'h-9 w-9 rounded-full text-sm font-normal transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-30',
          'aria-selected:bg-[#1a365d] aria-selected:text-white aria-selected:hover:bg-[#1a365d]/90 aria-selected:font-semibold',
        ),
        selected: '',
        today: 'font-bold [&:not([aria-selected])]:text-spartan-primary [&:not([aria-selected])]:underline [&:not([aria-selected])]:underline-offset-2',
        outside: 'text-muted-foreground/40 aria-selected:bg-[#1a365d]/50 aria-selected:text-white',
        disabled: 'opacity-30 pointer-events-none',
        range_start: 'rounded-l-full bg-[#1a365d]/15',
        range_end: 'rounded-r-full bg-[#1a365d]/15',
        range_middle: 'rounded-none bg-[#1a365d]/15',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }: { orientation?: string }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
        // Icono decorativo para los dropdowns
        DropdownNav: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
          <div {...rest} className="flex items-center gap-1">
            {React.Children.map(children, (child) => (
              <span className="relative inline-flex items-center">
                {child}
                <ChevronDown className="pointer-events-none absolute right-1 h-3 w-3 text-muted-foreground" />
              </span>
            ))}
          </div>
        ),
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
