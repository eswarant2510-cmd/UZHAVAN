export default function NotificationsBuyer() {
  const notes = [
    { id: 1, title: "New Lot Available", message: "500 kg Grade A Tomato" },

    { id: 2, title: "Offer Accepted", message: "Farmer accepted your offer." },

    { id: 3, title: "Shipment Update", message: "Order is in transit." },
  ]

  return (
    <div>
      <h1 className="text-3xl font-light text-agri-950 mb-6">Notifications</h1>
      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-2xl bg-white border p-4">
            <p className="font-bold">{n.title}</p>
            <p className="text-slate-600">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
