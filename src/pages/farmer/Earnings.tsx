import { inrCompact } from "../../lib/format"

export default function Earnings() {
  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        My Earnings
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border border-agri-100 p-6">
          <p className="text-slate-500">Released</p>
          <p className="text-4xl font-extrabold text-agri-800 mt-1">
            {inrCompact(84500)}
          </p>
        </div>
        <div className="rounded-3xl bg-white border border-agri-100 p-6">
          <p className="text-slate-500">In Escrow</p>
          <p className="text-4xl font-extrabold text-agri-800 mt-1">
            {inrCompact(16300)}
          </p>
        </div>
      </div>
    </div>
  )
}
