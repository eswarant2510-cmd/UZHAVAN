import LoginLayout from "../components/LoginLayout"

const icon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-6 h-6"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="1" y="3" width="15" height="13" rx="1" strokeLinejoin="round" />
    <path d="M16 8h4l3 3v5h-7V8z" strokeLinejoin="round" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

export default function LoginTransport() {
  return (
    <LoginLayout
      role="Transport"
      subtitle="Connect farmers with efficient delivery"
      accentHex="#ea580c"
      accentLight="#fff7ed"
      accentBorder="#fed7aa"
      bgImage="https://images.unsplash.com/photo-1774013603273-03507c48a0e8?w=900&h=1200&fit=crop&auto=format"
      bgImageAlt="Truck driving on a winding road through agricultural green fields"
      icon={icon}
      features={[
        {
          icon: "📋",
          text: "View and accept delivery requests near your location",
        },
        {
          icon: "🗺️",
          text: "AI-optimized route planning to minimize time and fuel cost",
        },
        {
          icon: "📦",
          text: "Manage active trips with real-time status updates",
        },
        {
          icon: "📍",
          text: "Share live location tracking with farmers and buyers",
        },
        {
          icon: "💳",
          text: "Receive payments directly upon successful delivery",
        },
      ]}
      quote="I get consistent delivery jobs on UZHAVAN. The route optimization saves me 2–3 hours on every trip."
      quoteAuthor="Dinesh Kumar, Truck Owner, Pune"
    />
  )
}
