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
        // month_caption es el contenedor "relative" — los botones del nav
        // son absolutos respecto a ESTE elemento (no respecto a month)
        month_caption: 'relative flex h-9 w-full items-center justify-center',
        caption_label: 'text-sm font-semibold capitalize text-foreground pointer-events-none',
        // nav ocupa el mismo espacio que month_caption mediante absolute
        nav: 'absolute inset-0 flex items-center justify-between',
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
        weekday: 'w-9 h-7 text-[0.7rem] text-muted-foreground flex items-center justify-center font-medium uppercase',
        week: 'flex w-full mt-1',
        day: cn(
          'relative h-9 w-9 p-0 text-center',
          // Strip continuo para rango en días intermedios
          '[&.rdp-range_middle]:bg-[#1a365d]/10 [&.rdp-range_middle]:rounded-none',
          '[&.rdp-range_start]:bg-[#1a365d]/10 [&.rdp-range_start]:rounded-l-full',
          '[&.rdp-range_end]:bg-[#1a365d]/10 [&.rdp-range_end]:rounded-r-full',
        ),
        day_button: cn(
          'relative z-10 h-9 w-9 rounded-full text-sm font-normal transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-30',
          // días seleccionados (inicio/fin de rango o día único)
          'aria-selected:bg-[#1a365d] aria-selected:text-white aria-selected:hover:bg-[#1a365d]/90 aria-selected:font-semibold',
        ),
        selected: '',
        today: 'font-bold text-spartan-primary [&:not([aria-selected])]:underline [&:not([aria-selected])]:underline-offset-2',
        outside: 'text-muted-foreground/40 aria-selected:bg-[#1a365d]/50 aria-selected:text-white',
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
