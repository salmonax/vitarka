/**
  Moment can be a huge dependency, so here is a
  time helper dump
**/

const ONE_DAY = 8.64e7
const PRONOUN_MAP = {
  '-1': 'Yesterday,',
  0: 'Today,',
  1: 'Tomorrow,'
}

function genRandTime (isBusinessHours) {
  const { floor, random } = Math
  const hours = isBusinessHours
    ? floor(random() * 9 + 9)
    : floor(random() * 25)
  const minutes = floor(random() * 60)
  return [hours, minutes, 0, 0]
}

export function getDateByOffset (num, base = null, isRandTime) {
  if (!base) base = null // avoid Date bug, in case undefined is passed
  const target = new Date(base || Date.now())
  target.setHours(0, 0, 0, 0)
  target.setTime(target.getTime() + 8.64e7 * num)
  if (isRandTime) {
    target.setHours(...genRandTime(true))
  }
  return target
}

export function countDaysToDate (date, base = null) {
  const target = new Date(base || Date.now())
  target.setHours(0, 0, 0, 0)
  const otherDate = new Date(date)
  otherDate.setHours(0, 0, 0, 0)
  return (otherDate - target) / ONE_DAY
}

export function getShortMonthName (date) {
  return date.toLocaleString('en-US', { month: 'short' })
}

export function getLongMonthName (date) {
  return date.toLocaleString('en-US', { month: 'long' })
}

export function isToday (date) {
  const today = new Date(Date.now())
  return today.toDateString() === date.toDateString()
}

export function getUniqueDates (dates, sort = true) {
  const hash = {}
  dates.forEach(date => {
    const zeroed = getDateByOffset(0, date)
    hash[zeroed.getTime()] = zeroed
  })
  const keys = Object.keys(hash)
  return (sort ? keys.sort((a, b) => b - a) : keys)
    .map(key => hash[key])
}

export function getPronounDateString (date = new Date()) {
  const locale = navigator.language || 'en-US'
  const weekday = date.toLocaleString(locale, { weekday: 'short' })
  const dmy = date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/-/g, '/')
  const pronoun = PRONOUN_MAP[countDaysToDate(date)] || ''
  return `${pronoun} ${weekday} ${dmy}`
}

export function getPronoun (date = new Date()) {
  return (PRONOUN_MAP[countDaysToDate(date)] || '').slice(0, -1)
}


export function formatTime (time) {
  return time.toLocaleTimeString(navigator.language || 'en-US')
    .split(' ').map(n => n.toLowerCase()).join(' ')
}

// June 1, 2018 10:54 AM
export function toOldTimelineDate (dateTime) {
  const date = new Date(dateTime)
  const month = getLongMonthName(date)
  const day = date.getDate()
  const timeString = date.toLocaleTimeString()

  return `${month}, ${day} ${timeString}`
}

export function countDaysInMonth (year, month) {
  return (new Date(year, month, 0)).getDate()
}

// 10:32 AM
export function toTimelineDate (dateTime) {
  const date = new Date(dateTime)
  const hours = date.getHours()
  const formattedHours = hours % 12
  const ampm = hours >= 12 ? 'pm' : 'am'
  const minutes = date.getMinutes()
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
  return `${formattedHours}: ${formattedMinutes} ${ampm}`
}

export function countDaysBetween (start, end) {
  return msToDays(
    Math.abs(
      start.getTime() - end.getTime()))
}

export function msToDays (ms) {
  return ms / 1000 / 60 / 60 / 24
}

export default {
  getDateByOffset,
  countDaysToDate,
  ONE_DAY,
  getUniqueDates,
  getPronounDateString,
  countDaysInMonth,
  getPronoun,
}
