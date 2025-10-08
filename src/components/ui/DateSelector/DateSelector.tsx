"use client"

import { useState } from "react"
import styles from "./DateSelector.module.css"

interface DateOption {
  date: number
  day: string
  month: string
  fullDate: Date
  available: boolean
}

interface DateSelectorProps {
  onDateSelect?: (date: Date) => void
  availableDates?: Date[]
  selectedDate?: Date | null
}

export default function DateSelector({ onDateSelect, availableDates, selectedDate }: DateSelectorProps) {
  // Generate sample dates (you can replace this with your actual available dates)
  const generateDates = (): DateOption[] => {
    const dates: DateOption[] = []
    const today = new Date()

    // If availableDates is provided, use those dates
    if (availableDates && availableDates.length > 0) {
      return availableDates.map(date => {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

        return {
          date: date.getDate(),
          day: dayNames[date.getDay()],
          month: monthNames[date.getMonth()],
          fullDate: date,
          available: true,
        }
      }).sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
    }

    // Generate next 14 days as fallback
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

      dates.push({
        date: date.getDate(),
        day: dayNames[date.getDay()],
        month: monthNames[date.getMonth()],
        fullDate: date,
        available: true,
      })
    }

    return dates
  }

  const dates = generateDates()

  const handleDateClick = (dateOption: DateOption) => {
    if (!dateOption.available) return

    onDateSelect?.(dateOption.fullDate)
  }

  const getMonthLabel = (index: number) => {
    if (index === 0) return dates[0].month
    if (dates[index].month !== dates[index - 1].month) {
      return dates[index].month
    }
    return null
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>SELECT DATE & TIME</h2>

      <div className={styles.calendarContainer}>
        <div className={styles.datesList}>
          {dates.map((dateOption, index) => {
            const monthLabel = getMonthLabel(index)
            const isSelected = selectedDate?.toDateString() === dateOption.fullDate.toDateString()

            return (
              <div key={index} className={styles.dateItem}>
                {monthLabel && <div className={styles.monthLabel}>{monthLabel}</div>}
                <div
                  className={`${styles.dateCard} ${
                    isSelected ? styles.selected : ""
                  } ${!dateOption.available ? styles.disabled : ""}`}
                  onClick={() => handleDateClick(dateOption)}
                >
                  <div className={styles.dateNumber}>{dateOption.date}</div>
                  <div className={styles.dayName}>{dateOption.day}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 