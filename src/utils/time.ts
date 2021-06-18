const DURATION_IN_SECONDS = {
  year: 31536000,
  month: 2592000,
  day: 86400,
  hour: 3600,
  minute: 60,
}

const rtf1 = new Intl.RelativeTimeFormat(navigator.language, {
  style: 'narrow',
})

export function timeSince(timestamp: number) {
  const seconds = Math.abs(Math.floor(Date.now() / 1000 - timestamp))

  if (seconds > DURATION_IN_SECONDS.year) return rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.year), 'year')

  if (seconds > DURATION_IN_SECONDS.month) return rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.month), 'month')

  if (seconds > DURATION_IN_SECONDS.day) return rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.day), 'day')

  if (seconds > DURATION_IN_SECONDS.hour) return rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.hour), 'hour')

  if (seconds > DURATION_IN_SECONDS.minute) return rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.minute), 'minute')

  return rtf1.format(-1 * seconds, 'second')
}
