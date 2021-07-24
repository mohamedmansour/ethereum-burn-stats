
const DURATION_IN_SECONDS = {
  year: 31536000,
  month: 2592000,
  day: 86400,
  hour: 3600,
  minute: 60
}

const rtf1 = new Intl.RelativeTimeFormat(navigator.language, { style: 'narrow' });

export function timeSince(timestamp: number) {
  const seconds = Math.abs(Math.floor((Date.now() / 1000) - timestamp))
  let formattedText = ''
  if (seconds > DURATION_IN_SECONDS.year)
    formattedText = rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.year), 'year')
  else if (seconds > DURATION_IN_SECONDS.month)
    formattedText = rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.month), 'month')
  else if (seconds > DURATION_IN_SECONDS.day)
    formattedText =  rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.day), 'day')
  else if (seconds > DURATION_IN_SECONDS.hour)
    formattedText =  rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.hour), 'hour')
  else if (seconds > DURATION_IN_SECONDS.minute)
    formattedText = rtf1.format(-1 * Math.floor(seconds / DURATION_IN_SECONDS.minute), 'minute')
  else
    formattedText = rtf1.format(-1 * seconds, 'second')
  
  // Translation in browser adds a dot for some strange reason.
  const foundDot = formattedText.indexOf('.')
  if (foundDot) {
    formattedText = formattedText.substr(0, foundDot) + formattedText.substr(foundDot + 1)
  }

  return formattedText
}