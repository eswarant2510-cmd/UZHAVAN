export function inr(value: number, digits = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function inrCompact(value: number) {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(value))}`
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}
