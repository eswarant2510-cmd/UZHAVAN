import LoginLayout from "../components/LoginLayout"

const icon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-6 h-6"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"
      strokeLinejoin="round"
    />
    <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
  </svg>
)

export default function LoginBuyer() {
  return (
    <LoginLayout
      role="Buyer"
      subtitle="Source verified produce with confidence"
      accentHex="#2563eb"
      accentLight="#eff6ff"
      accentBorder="#bfdbfe"
      bgImage="https://images.unsplash.com/photo-1606237906294-ae86d103d715?w=900&h=1200&fit=crop&auto=format"
      bgImageAlt="Fresh vegetables and produce at an agricultural market"
      icon={icon}
      features={[
        {
          icon: "🔍",
          text: "Browse AI-verified produce lots by crop, region and grade",
        },
        {
          icon: "📊",
          text: "Compare prices across lots and negotiate transparently",
        },
        {
          icon: "✅",
          text: "Place secure orders with escrow-backed payment protection",
        },
        {
          icon: "📍",
          text: "Track live delivery status and logistics updates",
        },
        {
          icon: "📁",
          text: "Manage your procurement history and vendor analytics",
        },
      ]}
      quote="UZHAVAN helped me source 40 tonnes of onions in 2 days with full price transparency — no middlemen."
      quoteAuthor="Suresh Agarwal, Mumbai Wholesale Buyer"
    />
  )
}
