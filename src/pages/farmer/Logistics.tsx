import { useNavigate } from "react-router"

export default function Logistics() {
  const navigate = useNavigate()
  return (
    <div>
      <p className="text-xs font-bold text-agri-500 mb-1">
        DEMO · TRANSPORT MATCHING PLACEHOLDER
      </p>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Logistics
      </h1>
      <div className="rounded-3xl overflow-hidden bg-white border border-agri-100">
        <img
          src="https://images.unsplash.com/photo-1774013603273-03507c48a0e8?w=1200&h=500&fit=crop&auto=format"
          alt="Truck on agricultural road"
          className="h-48 w-full object-cover"
        />
        <div className="p-6">
          <p className="text-2xl font-extrabold text-agri-950">
            Nashik → Mumbai
          </p>
          <p className="text-4xl font-extrabold text-agri-600 mt-2">₹700</p>
          <p className="text-slate-500 mt-1">
            Estimated for 500 kg Tomato · 42 km
          </p>
          <button
            onClick={() => navigate("/farmer/decision")}
            className="mt-6 min-h-12 px-6 rounded-2xl bg-agri-500 text-white font-bold"
          >
            Apply to Selling Decision
          </button>
        </div>
      </div>
    </div>
  )
}
