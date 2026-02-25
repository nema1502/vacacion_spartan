'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn('p-3 select-none', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'flex flex-col gap-3',
        month_caption: 'relative flex items-center justify-center py-1 px-8',
        caption_label: 'text-sm font-semibold capitalize text-foreground',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between px-1 py-1',
        button_previous: cn(
          'h-7 w-7 rounded-md inline-flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ),
        button_next: cn(
          'h-7 w-7 rounded-md inline-flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 h-7 text-[0.7rem] text-muted-foreground flex items-center justify-center font-medium',
        week: 'flex w-full mt-1',
        // day = the <td> container; gets range_start / range_end / range_middle
        day: cn(
          'relative h-9 w-9 p-0 text-center',
          // Range middle: fill the full cell width for a continuous strip
          '[&.rdp-range_middle]:bg-[#1a365d]/12 [&.rdp-range_middle]:rounded-none',
          // Round ends of range
          '[&.rdp-range_start]:rounded-l-full [&.rdp-range_end]:rounded-r-full',
          '[&.rdp-range_start]:bg-transparent [&.rdp-range_end]:bg-transparent',
        ),
        // day_button = the <button> inside; gets selected / today / etc.
        day_button: cn(
          'h-9 w-9 rounded-full text-sm font-normal transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-30',
          'aria-selected:bg-[#1a365d] aria-selected:text-white aria-selected:hover:bg-[#1a365d]',
        ),
        selected: 'bg-[#1a365d] text-white rounded-full',
        today: 'bg-accent text-accent-foreground font-semibold',
        outside: 'text-muted-foreground opacity-40',
        disabled: 'opacity-30 pointer-events-none',
        range_start: 'rdp-range_start',
        range_end: 'rdp-range_end',
        range_middle: 'rdp-range_middle',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }: { orientation?: string }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
