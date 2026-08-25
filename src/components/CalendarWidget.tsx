import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './CalendarWidget.css'

interface CalendarWidgetProps {
  onSelectDate?: (date: Date) => void
}

export default function CalendarWidget({ onSelectDate }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<number>(12)
  const [orangeHighlightedDate] = useState<number>(18)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const days = []
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  return (
    <div className="calendar-widget">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="cal-nav-btn" title="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <span className="calendar-month-title">
          {monthNames[month]} {year}
        </span>
        <button onClick={handleNextMonth} className="cal-nav-btn" title="Próximo mês">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-weekdays">
        <span>S</span>
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
      </div>

      <div className="calendar-days-grid">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="cal-day empty"></div>
          }

          const isSelectedNavy = day === selectedDate
          const isSelectedOrange = day === orangeHighlightedDate

          let dayClass = 'cal-day'
          if (isSelectedNavy) dayClass += ' active-navy'
          if (isSelectedOrange) dayClass += ' active-orange'

          return (
            <button
              key={`day-${day}`}
              className={dayClass}
              onClick={() => {
                setSelectedDate(day)
                if (onSelectDate) onSelectDate(new Date(year, month, day))
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
