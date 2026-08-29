import { useState } from "react"

export default function Transport() {
  const options = [
    {
      id: "mini",
      label: "Mini Truck",
      cost: 700,
      eta: "4 hours",
      cap: "1 ton",
    },

    {
      id: "large",
      label: "Large Truck",
      cost: 1400,
      eta: "5 hours",
      cap: "3 tons",
    },
  ]

  const [sel, setSel] = useState(options[0].id)

  return (
    <div>
      <h1 className="text-3xl font-light text-agri-950 mb-6">
        Transport Options
      </h1>
      <div className="grid gap-4">
        {options.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl bg-white border border-agri-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-lg font-extrabold">{o.label}</p>
              <p className="text-sm text-slate-500">
                Capacity: {o.cap} · ETA: {o.eta}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold">₹{o.cost}</p>
              <button
                onClick={() => setSel(o.id)}
                className={`mt-2 px-4 py-2 rounded-xl ${
                  sel === o.id ? "bg-agri-500 text-white" : "bg-agri-50"
                }`}
              >
                Select
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
