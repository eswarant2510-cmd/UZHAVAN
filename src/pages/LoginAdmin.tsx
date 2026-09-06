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
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      strokeLinejoin="round"
    />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function LoginAdmin() {
  return (
    <LoginLayout
      role="Admin"
      subtitle="Monitor and govern the entire ecosystem"
      accentHex="#8b5cf6"
      accentLight="#f5f3ff"
      accentBorder="#ddd6fe"
      bgImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=1200&fit=crop&auto=format"
      bgImageAlt="Analytics dashboard with performance graphs on a laptop screen"
      icon={icon}
      features={[
        {
          icon: "📊",
          text: "Monitor lots, payments, settlements, and trade activity across the marketplace.",
        },
        {
          icon: "✅",
          text: "Approve or review farmer, buyer, and transport onboarding and verification status.",
        },
        {
          icon: "⚖️",
          text: "Resolve disputes with clear evidence, audit trail, and trust-score context.",
        },
        {
          icon: "🛡️",
          text: "Track trust and reliability signals across verified transaction history.",
        },
        {
          icon: "📈",
          text: "Review market health, risk patterns, and operational dashboards in one place.",
        },
      ]}
      quote="With UZHAVAN admin controls, we can verify every transaction path and maintain trust across the entire ecosystem."
      quoteAuthor="Operations Control, UZHAVAN"
    />
  )
}
