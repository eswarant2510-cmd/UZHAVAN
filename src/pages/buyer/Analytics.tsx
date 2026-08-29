import { inrCompact } from "../../lib/format"

export default function Analytics() {
  const data = { total: 240000, avg: 29, active: 6, completed: 32 }

  return (
    <div>
      <h1 className="text-3xl font-light text-agri-950 mb-6">
        Purchase Analytics
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Total Purchases" value={inrCompact(data.total)} />
        <Card label="Average Price" value={`₹${data.avg}/kg`} />
        <Card label="Active Orders" value={String(data.active)} />
        <Card label="Completed" value={String(data.completed)} />
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-agri-100 p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-extrabold mt-2">{value}</div>
    </div>
  )
}
