import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import type {
  SmartLot,
  BuyerOffer,
  TransportOption,
  MarketIntelligence,
} from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"
import { calculateNetRealisation } from "../../lib/netRealisation"
import { runDecisionEngine } from "../../services/decisionEngine"

export default function LotDetail() {
  const { lotId } = useParams()
  const navigate = useNavigate()
  const [lot, setLot] = useState<SmartLot | null | undefined>(undefined)
  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [vehicles, setVehicles] = useState<TransportOption[]>([])

  // Mappings of selected vehicles
  const [compareVehicleIds, setCompareVehicleIds] =
    useState<Record<string, string>>({})
  const [modalVehicleId, setModalVehicleId] = useState<string>("")
  const [market, setMarket] = useState<MarketIntelligence | null>(null)

  // Custom navigation state inside details
  const [viewMode, setViewMode] =
    useState<"detail" | "offers" | "compare" | "decision">("detail")
  const [selectedOffer, setSelectedOffer] = useState<BuyerOffer | null>(null)

  // Edit Form Fields State
  const [isEditing, setIsEditing] = useState(false)
  const [crop, setCrop] = useState("")
  const [variety, setVariety] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [unit, setUnit] = useState("kg")
  const [harvestDate, setHarvestDate] = useState("")
  const [sellDate, setSellDate] = useState("")
  const [location, setLocation] = useState("")
  const [minPrice, setMinPrice] = useState<number | "">("")
  const [photos, setPhotos] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!lotId) return
    loadLotAndOffers()
  }, [lotId])

  async function loadLotAndOffers() {
    try {
      const lotData = await farmerApi.getLot(lotId!)
      setLot(lotData)
      if (lotData) {
        setCrop(lotData.crop || "Tomato")
        setVariety(lotData.variety || "")
        setQuantity(lotData.quantityKg || 0)
        setUnit(lotData.unit || "kg")
        setHarvestDate(lotData.harvestDate || "")
        setSellDate(lotData.expectedSellingDate || "")
        setLocation(lotData.location || "")
        setMinPrice(lotData.minPricePerKg || lotData.expectedNetPerKg || "")
        setPhotos(
          lotData.photos || (lotData.imageUrl ? [lotData.imageUrl] : []),
        )

        // Fetch buyer offers associated with this specific lot
        const offerData = await farmerApi.getOffersForLot(lotId!)
        setOffers(offerData || [])

        // Fetch transport options
        const vehicleData = await farmerApi.getTransportOptions()
        setVehicles(vehicleData || [])

        // Fetch market intelligence
        const marketData = await farmerApi.getMarket(lotData.crop || "Tomato")
        setMarket(marketData)
      }
    } catch (err: any) {
      setError("Failed to load details.")
    }
  }

  // Initialize vehicle map for comparison view
  useEffect(() => {
    if (offers.length > 0 && lot && vehicles.length > 0) {
      const firstSuitable = vehicles.find((v) => v.capacityKg >= lot.quantityKg)
      const mapping: Record<string, string> = {}
      offers.forEach((o) => {
        mapping[o.id] = firstSuitable?.id || ""
      })
      setCompareVehicleIds(mapping)
    }
  }, [offers, lot, vehicles])

  // Initialize selected vehicle in modal view
  useEffect(() => {
    if (selectedOffer && lot && vehicles.length > 0) {
      const firstSuitable = vehicles.find((v) => v.capacityKg >= lot.quantityKg)
      setModalVehicleId(firstSuitable?.id || "")
    }
  }, [selectedOffer, lot, vehicles])

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    setError(null)

    Array.from(files).forEach((file) => {
      if (file.size > 1024 * 1024) {
        setError("Image size too large. Please select an image under 1MB.")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotos((prev) => [...prev, reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity")
      return
    }
    if (!location.trim()) {
      setError("Please enter the storage location")
      return
    }
    if (!harvestDate) {
      setError("Please select the harvest date")
      return
    }
    if (!sellDate) {
      setError("Please select the available/selling date")
      return
    }

    setSaving(true)
    const updatedPayload = {
      crop,
      variety,
      quantityKg: Number(quantity),
      unit,
      imageUrl: photos[0] || "",
      photos,
      location,
      expectedNetPerKg: Number(minPrice) || 0,
      minPricePerKg: Number(minPrice) || 0,
      status: lot?.status || "active",
      harvestDate,
      expectedSellingDate: sellDate,
    }

    try {
      await farmerApi.updateLot(lotId!, updatedPayload)
      setSaving(false)
      setIsEditing(false)
      loadLotAndOffers()
    } catch (err: any) {
      setError(err.message || "Failed to update lot details.")
      setSaving(false)
    }
  }

  async function handleCancelLot() {
    if (
      !window.confirm(
        "Are you sure you want to cancel this smart lot? This action cannot be undone.",
      )
    ) {
      return
    }
    setError(null)
    setCancelling(true)

    try {
      await farmerApi.cancelLot(lotId!)
      setCancelling(false)
      loadLotAndOffers()
      navigate("/farmer/lots")
    } catch (err: any) {
      setError(err.message || "Failed to cancel lot.")
      setCancelling(false)
    }
  }

  // Accept and Reject Handlers
  async function handleAcceptOffer(offerId: string) {
    setError(null)
    setActionSuccess(null)
    try {
      await farmerApi.updateOfferStatus(offerId, "accepted")
      setActionSuccess("Offer Accepted")
      setSelectedOffer(null)
      loadLotAndOffers()
    } catch (err: any) {
      setError("Failed to accept offer.")
    }
  }

  async function handleRejectOffer(offerId: string) {
    setError(null)
    setActionSuccess(null)
    try {
      await farmerApi.updateOfferStatus(offerId, "rejected")
      setActionSuccess("Offer Rejected")
      setSelectedOffer(null)
      loadLotAndOffers()
    } catch (err: any) {
      setError("Failed to reject offer.")
    }
  }

  function getReliabilityRating(
    verified: boolean,
    risk: BuyerOffer["buyerRisk"],
  ) {
    const verificationLabel = verified ? "Verified" : "Unverified"
    const riskLabel =
      risk === "LOW"
        ? "Low Risk"
        : risk === "MEDIUM"
          ? "Medium Risk"
          : "High Risk"
    return `${verificationLabel} (${riskLabel})`
  }

  if (lot === undefined) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="h-64 rounded-3xl bg-green-50 animate-pulse" />
        <div className="h-10 w-48 rounded bg-green-150 animate-pulse" />
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="text-center py-16 bg-white border border-red-150 max-w-md mx-auto rounded-3xl">
        <span className="text-5xl block mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-red-700">Lot Not Found</h2>
        <button
          onClick={() => navigate("/farmer/lots")}
          className="mt-6 px-5 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl text-sm"
        >
          Back to My Lots
        </button>
      </div>
    )
  }

  const lotStatusColors = {
    active: { bg: "#edf9f0", text: "#2e7d3a", label: "Active" },
    sold: { bg: "#eff6ff", text: "#1d4ed8", label: "Sold" },
    in_transit: { bg: "#fff7ed", text: "#c2410c", label: "In Transit" },
    cancelled: { bg: "#f3f4f6", text: "#6b7280", label: "Cancelled" },
  }[lot.status || "active"]

  return (
    <div className="max-w-2xl mx-auto font-sans p-2">
      {/* Alert Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
          🎉 {actionSuccess}
        </div>
      )}

      {/* --- MODE 1: DETAIL VIEW --- */}
      {viewMode === "detail" && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/farmer/lots")}
              className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-[#2e7d3a] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-[#122b16]">
                Lot details
              </h1>
              <p className="text-xs text-slate-400">
                Lot ID:{" "}
                <span className="font-mono font-bold uppercase">{lot.id}</span>
              </p>
            </div>
          </div>

          {!isEditing ? (
            <div className="bg-white border border-[#a7e4b0]/70 rounded-3xl overflow-hidden shadow-sm">
              <div className="h-64 sm:h-80 bg-slate-100 relative">
                <img
                  src={
                    lot.imageUrl ||
                    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&h=600&fit=crop&auto=format"
                  }
                  alt={lot.crop}
                  className="w-full h-full object-cover"
                />
                <span
                  className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full shadow"
                  style={{
                    background: lotStatusColors.bg,
                    color: lotStatusColors.text,
                  }}
                >
                  {lotStatusColors.label}
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-[#122b16]">
                    {lot.crop}{" "}
                    {lot.variety && (
                      <span className="text-lg font-bold text-slate-500">
                        ({lot.variety})
                      </span>
                    )}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Storage Location: {lot.location}
                  </p>
                </div>

                {/* Sub-Photos */}
                {lot.photos && lot.photos.length > 1 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-slate-550 uppercase">
                      Produce Photos
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {lot.photos.map((u, idx) => (
                        <img
                          key={idx}
                          src={u}
                          alt={`doc-${idx}`}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 bg-[#edf9f0]/40 rounded-3xl p-5 border border-[#a7e4b0]/40">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Quantity
                    </p>
                    <p className="text-xl font-extrabold text-[#122b16] mt-0.5">
                      {lot.quantityKg.toLocaleString()} {lot.unit || "kg"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Min Price
                    </p>
                    <p className="text-xl font-extrabold text-[#2e7d3a] mt-0.5">
                      {lot.minPricePerKg
                        ? `₹${lot.minPricePerKg}/kg`
                        : "Not set"}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#a7e4b0]/35 col-span-2 text-xs font-semibold text-slate-650 grid grid-cols-2 gap-1">
                    <div>
                      🌾 Harvest:{" "}
                      {lot.harvestDate
                        ? new Date(lot.harvestDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div>
                      📅 Available:{" "}
                      {lot.expectedSellingDate
                        ? new Date(lot.expectedSellingDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>

                {/* BUYERS OFFERS DEEP LINK */}
                <div className="py-2 space-y-2">
                  {offers.length > 0 ? (
                    <button
                      onClick={() => setViewMode("offers")}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.01] transition text-white font-extrabold text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>💬 View Eligible Buyer Offers</span>
                      <span className="bg-white text-green-700 font-bold px-2 py-0.5 rounded-full text-xs">
                        {offers.filter((o) => o.status !== "rejected").length}{" "}
                        Offers
                      </span>
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-semibold">
                      Waiting for buyer matches to bid on this lot...
                    </div>
                  )}

                  <button
                    onClick={() => setViewMode("decision")}
                    className="w-full py-4 rounded-2xl bg-white border-2 border-[#122b16] hover:bg-slate-50 transition text-[#122b16] font-black text-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>💡 AI Best Selling Decision Engine</span>
                    <span className="bg-[#122b16] text-[#a7e4b0] font-bold px-2.5 py-0.5 rounded-full text-[9px]">
                      OPTIMIZE YIELD
                    </span>
                  </button>
                </div>

                {lot.status !== "cancelled" && (
                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleCancelLot}
                      disabled={cancelling}
                      className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 font-bold rounded-2xl text-xs transition cursor-pointer"
                    >
                      {cancelling ? "Cancelling..." : "❌ Cancel Lot"}
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold rounded-2xl text-xs transition cursor-pointer"
                    >
                      ✏️ Edit Lot
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#a7e4b0]/70 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-[#122b16] mb-5">
                Edit Lot Specs
              </h2>
              <form onSubmit={handleSaveChanges} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Crop
                    </label>
                    <select
                      value={crop}
                      onChange={(e) => setCrop(e.target.value)}
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="Tomato">Tomato</option>
                      <option value="Onion">Onion</option>
                      <option value="Potato">Potato</option>
                      <option value="Sugarcane">Sugarcane</option>
                      <option value="Paddy">Paddy</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Maize">Maize</option>
                      <option value="Chili">Chili</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Variety
                    </label>
                    <input
                      type="text"
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Unit
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="quintals">quintals</option>
                      <option value="tonnes">tonnes</option>
                      <option value="crates">crates</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Harvest Date
                    </label>
                    <input
                      type="date"
                      value={harvestDate}
                      onChange={(e) => setHarvestDate(e.target.value)}
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">
                      Available Date
                    </label>
                    <input
                      type="date"
                      value={sellDate}
                      onChange={(e) => setSellDate(e.target.value)}
                      className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1">
                    Min Acceptable Price (₹/kg)
                  </label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1">
                    Attached Photos
                  </label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    <label className="w-16 h-16 rounded-xl border border-dashed border-[#a7e4b0] flex flex-col items-center justify-center bg-[#edf9f0]/40 text-slate-500 cursor-pointer">
                      <span className="text-xl">📸</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        multiple
                      />
                    </label>
                    {photos.map((u, i) => (
                      <div
                        key={i}
                        className="relative w-16 h-16 border rounded-xl overflow-hidden"
                      >
                        <img
                          src={u}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold transition text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-green-600 text-white font-extrabold transition text-xs shadow-md cursor-pointer"
                  >
                    {saving ? "Saving..." : "💾 Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* --- MODE 2: OFFERS LISTING VIEW --- */}
      {viewMode === "offers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("detail")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M15 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-[#122b16]">
                  Buyer Offers
                </h1>
                <p className="text-xs text-slate-400">
                  Available offers for Lot #{lot.id}
                </p>
              </div>
            </div>
            {offers.length > 1 && (
              <button
                onClick={() => setViewMode("compare")}
                className="px-4 py-2.5 bg-green-50 hover:bg-green-100 text-[#2e7d3a] border border-green-200 rounded-xl text-xs font-black transition cursor-pointer"
              >
                📊 Compare Offers
              </button>
            )}
          </div>

          <div className="space-y-4">
            {offers.map((offer) => {
              const dateText = offer.createdAt
                ? new Date(offer.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })
                : "Active Today"

              const statusColor = {
                active: "bg-blue-50 text-blue-800 border-blue-200",
                accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
                rejected: "bg-red-50 text-red-800 border-red-200",
              }[offer.status || "active"]

              const reliability = getReliabilityRating(
                offer.verified,
                offer.buyerRisk,
              )

              return (
                <div
                  key={offer.id}
                  onClick={() => setSelectedOffer(offer)}
                  className="bg-white border border-[#a7e4b0]/40 rounded-3xl p-5 hover:shadow-md transition duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-[#122b16] text-lg">
                        {offer.buyerName}
                      </h3>
                      {offer.verified && (
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          ✓ Verified
                        </span>
                      )}
                      {offer.id.includes("DEMO") && (
                        <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          Demo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-550">
                      <div>
                        📦 Request:{" "}
                        <span className="text-slate-800 font-bold">
                          {offer.quantityKg?.toLocaleString() || lot.quantityKg}{" "}
                          kg
                        </span>
                      </div>
                      <div>
                        🛡️ Risk:{" "}
                        <span className="text-slate-850 font-bold">
                          {offer.buyerRisk}
                        </span>
                      </div>
                      <div>
                        📍 Distance:{" "}
                        <span className="text-slate-850 font-bold">
                          {offer.distanceKm} km
                        </span>
                      </div>
                      <div>
                        📅 Sent:{" "}
                        <span className="text-slate-700 font-bold">
                          {dateText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-green-700 leading-none">
                        ₹{offer.offerPricePerKg}
                        <span className="text-xs font-semibold text-slate-450">
                          /kg
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Reliability:{" "}
                        {offer.verified ? "Verified ✓" : "Unverified"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded inline-block border ${statusColor}`}
                    >
                      {offer.status || "active"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- MODE 3: COMPARISON VIEW --- */}
      {viewMode === "compare" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("offers")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M15 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-[#122b16]">
                  Compare Selling Options
                </h1>
                <p className="text-xs text-slate-400">
                  Evaluating offer + specific transport combinations (Lot
                  quantity: {lot.quantityKg} kg)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#a7e4b0]/70 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-[9px] text-slate-650 tracking-wider">
                  <th className="p-4 sm:p-5 min-w-[150px]">
                    Option Attributes
                  </th>
                  {offers.map((o) => (
                    <th
                      key={o.id}
                      className="p-4 sm:p-5 border-l border-slate-100 min-w-[220px]"
                    >
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-900 text-xs truncate">
                          {o.buyerName}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {o.verified ? (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded uppercase font-extrabold">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded uppercase font-extrabold">
                              Unverified
                            </span>
                          )}
                          {o.id.includes("DEMO") && (
                            <span className="text-[8px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded uppercase font-bold">
                              DEMO
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {/* 1. Price/kg */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 sm:p-5 font-bold text-slate-900">
                    Offer price/kg
                  </td>
                  {offers.map((o) => (
                    <td
                      key={o.id}
                      className="p-4 sm:p-5 border-l border-slate-100 font-extrabold text-sm"
                    >
                      ₹{o.offerPricePerKg}/kg
                    </td>
                  ))}
                </tr>
                {/* 2. Transit Distance */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 sm:p-5">Transit Distance</td>
                  {offers.map((o) => (
                    <td
                      key={o.id}
                      className="p-4 sm:p-5 border-l border-slate-100"
                    >
                      {o.distanceKm} km
                    </td>
                  ))}
                </tr>

                {/* 3. Transport Vehicle Selection */}
                <tr className="hover:bg-slate-50 border-y border-dashed border-[#a7e4b0]/40">
                  <td className="p-4 sm:p-5 font-bold text-[#122b16]">
                    Transport Vehicle
                  </td>
                  {offers.map((o) => {
                    const selectedVehicleId = compareVehicleIds[o.id]
                    return (
                      <td
                        key={o.id}
                        className="p-4 border-l border-slate-100 bg-green-50/10"
                      >
                        <select
                          value={selectedVehicleId || ""}
                          onChange={(e) =>
                            setCompareVehicleIds((prev) => ({
                              ...prev,
                              [o.id]: e.target.value,
                            }))
                          }
                          className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                        >
                          {vehicles.map((v) => {
                            const isSuitable = v.capacityKg >= lot.quantityKg
                            return (
                              <option
                                key={v.id}
                                value={v.id}
                                disabled={!isSuitable}
                              >
                                {v.vehicleType} ({v.capacityKg} kg){" "}
                                {!isSuitable ? "(NOT SUITABLE)" : "(SUITABLE)"}
                              </option>
                            )
                          })}
                        </select>
                      </td>
                    )
                  })}
                </tr>

                {/* 4. Gross Value */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 sm:p-5">Gross Sale Value</td>
                  {offers.map((o) => {
                    const gross = o.offerPricePerKg * lot.quantityKg
                    return (
                      <td
                        key={o.id}
                        className="p-4 sm:p-5 border-l border-slate-100 text-slate-800"
                      >
                        ₹{gross.toLocaleString("en-IN")}
                      </td>
                    )
                  })}
                </tr>

                {/* 5. Cost calculation */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 sm:p-5 text-red-650 font-bold">
                    Transport Cost (−)
                  </td>
                  {offers.map((o) => {
                    const selectedVehicleId = compareVehicleIds[o.id]
                    const vehicle = vehicles.find(
                      (v) => v.id === selectedVehicleId,
                    )
                    const cost = vehicle
                      ? vehicle.baseCost + o.distanceKm * vehicle.costPerKm
                      : 0
                    return (
                      <td
                        key={o.id}
                        className="p-4 sm:p-5 border-l border-slate-100 text-red-650 font-extrabold"
                      >
                        − ₹{cost.toLocaleString("en-IN")}
                      </td>
                    )
                  })}
                </tr>

                {/* 6. Net Realisation Breakdown */}
                <tr className="hover:bg-slate-50 bg-[#edf9f0]/10 border-t border-slate-100">
                  <td className="p-4 sm:p-5 font-black text-[#2e7d3a] text-sm">
                    Expected Net Realisation
                  </td>
                  {offers.map((o) => {
                    const selectedVehicleId = compareVehicleIds[o.id]
                    const vehicle = vehicles.find(
                      (v) => v.id === selectedVehicleId,
                    )
                    const transportCost = vehicle
                      ? vehicle.baseCost + o.distanceKm * vehicle.costPerKm
                      : 0
                    const breakdown = calculateNetRealisation(
                      lot.quantityKg,
                      o.offerPricePerKg,
                      transportCost,
                    )
                    return (
                      <td
                        key={o.id}
                        className="p-4 sm:p-5 border-l border-slate-100 bg-[#edf9f0]/10 font-bold"
                      >
                        <p className="text-sm font-black text-green-700 leading-none">
                          ₹{breakdown.netRealisation.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-slate-455 mt-1 font-semibold">
                          ₹{breakdown.netPricePerKg.toFixed(2)}/kg net
                        </p>
                      </td>
                    )
                  })}
                </tr>

                {/* 7. Data Provenance */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 sm:p-5 text-[10px] text-slate-400 uppercase tracking-wider">
                    Provenance / Source
                  </td>
                  {offers.map((o) => {
                    const selectedVehicleId = compareVehicleIds[o.id]
                    const vehicle = vehicles.find(
                      (v) => v.id === selectedVehicleId,
                    )
                    return (
                      <td
                        key={o.id}
                        className="p-4 sm:p-5 border-l border-slate-100 text-[10px] text-slate-400 font-medium"
                      >
                        <div className="space-y-0.5">
                          <p>
                            Offer:{" "}
                            {o.id.includes("DEMO")
                              ? "DEMO OFFER"
                              : "OFFICIAL BUYER"}
                          </p>
                          {vehicle ? (
                            <p>Transport: ESTIMATED SYSTEM RATE</p>
                          ) : (
                            <p>Transport: N/A</p>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>

                {/* 8. Action Trigger Row */}
                <tr>
                  <td className="p-4 sm:p-5 bg-slate-50/20">
                    <span className="text-[10px] text-slate-400 italic">
                      "Transport cost reduces the amount you receive."
                    </span>
                  </td>
                  {offers.map((o) => (
                    <td
                      key={o.id}
                      className="p-4 border-l border-slate-100 text-center"
                    >
                      <button
                        onClick={() => setSelectedOffer(o)}
                        className="w-full py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 cursor-pointer transition shadow-xs"
                      >
                        Inspect & Accept
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODE 4: DECISION ENGINE VIEW --- */}
      {viewMode === "decision" &&
        (() => {
          const rec = runDecisionEngine(lot, market, offers, vehicles)
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("detail")}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M15 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-extrabold text-[#122b16]">
                    AI Best Selling Decision
                  </h1>
                  <p className="text-xs text-slate-400">
                    Data-driven matching engine comparing buyer bids with local
                    Mandi prices and transport options
                  </p>
                </div>
              </div>

              {rec.decision === "INSUFFICIENT_DATA" ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">
                      Insufficient Data Available
                    </h3>
                  </div>
                  <p className="text-slate-650 text-xs leading-relaxed font-semibold">
                    {rec.explanation}
                  </p>
                  <div className="bg-white/60 rounded-2xl p-4 border border-amber-200/50 space-y-2 text-xs font-semibold text-slate-700">
                    <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider text-amber-700">
                      What is missing:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      {rec.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Left Card: Best Option Summary */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Recommendation Card */}
                    <div className="bg-gradient-to-br from-[#122b16] to-[#1b3d20] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
                      <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-green-500/10 rounded-full blur-2xl" />

                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="bg-green-700 text-[#a7e4b0] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            UZHAVAN Recommendation
                          </span>
                          <h2 className="text-3xl font-black mt-2 tracking-tight">
                            {rec.decision === "SELL_NOW" && "⚡ SELL NOW"}
                            {rec.decision === "WAIT" && "⏳ HOLD & WAIT"}
                            {rec.decision === "CHOOSE_BUYER" &&
                              "🤝 SELL TO BUYER"}
                            {rec.decision === "CHOOSE_MARKET" &&
                              "🏛️ SELL AT MANDI"}
                          </h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center px-4">
                          <span className="block text-[8px] text-green-300 font-bold uppercase tracking-wider">
                            Confidence
                          </span>
                          <span className="text-xs font-extrabold uppercase">
                            {rec.confidence}
                          </span>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-green-150/90 leading-relaxed font-semibold">
                        {rec.explanation}
                      </p>

                      {/* Reasons list */}
                      <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                        <p className="text-[10px] text-green-300 font-black uppercase tracking-wider">
                          Key Deciding Factors:
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs font-semibold">
                          {rec.reasons.map((reason, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-green-400">✓</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Why This Option / Calculation Flow */}
                    {rec.bestOption && (
                      <div className="bg-white border border-[#a7e4b0]/40 rounded-3xl p-6 sm:p-8 space-y-5">
                        <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest">
                          Net Realisation Breakdown
                        </h3>

                        <div className="grid grid-cols-3 gap-3 text-center border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-black uppercase">
                              Gross Offer
                            </span>
                            <span className="text-sm font-extrabold text-slate-800">
                              ₹
                              {rec.bestOption.grossValue.toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-red-500 font-black uppercase">
                              Logistics Cost
                            </span>
                            <span className="text-sm font-extrabold text-red-650">
                              − ₹
                              {rec.bestOption.transportCost.toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-green-700 font-black uppercase">
                              Net Yield
                            </span>
                            <span className="text-sm font-black text-green-700">
                              ₹
                              {rec.bestOption.netRealisation.toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="bg-green-50/20 border border-green-200/50 rounded-2xl p-4 text-xs font-semibold text-slate-700 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-green-700 font-black uppercase font-medium">
                              Net Realized Price per kg
                            </p>
                            <p className="text-lg font-black text-slate-900 mt-1">
                              ₹{rec.bestOption.netPricePerKg.toFixed(2)}/kg
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase">
                              Gross rate per kg
                            </p>
                            <p className="text-lg font-extrabold text-slate-700 mt-1">
                              ₹{rec.bestOption.pricePerKg.toFixed(2)}/kg
                            </p>
                          </div>
                        </div>

                        {/* Technical Calculations footnote */}
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          * Calculations derived deterministically from:{" "}
                          {lot.quantityKg} kg lot × ₹{rec.bestOption.pricePerKg}
                          /kg offer rate − ₹{rec.bestOption.transportCost}{" "}
                          logistics fee.
                        </p>
                      </div>
                    )}

                    {/* Alternatives List */}
                    {rec.alternatives.length > 0 && (
                      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
                        <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest">
                          Evaluating Alternatives
                        </h3>
                        <div className="divide-y divide-slate-100">
                          {rec.alternatives.map((alt, idx) => {
                            const isBetterNet = rec.bestOption
                              ? alt.netRealisation >
                                rec.bestOption.netRealisation
                              : false
                            const netDiff = rec.bestOption
                              ? Math.abs(
                                  alt.netRealisation -
                                    rec.bestOption.netRealisation,
                                )
                              : 0
                            return (
                              <div key={idx} className="py-3.5 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-slate-800">
                                        {alt.name}
                                      </span>
                                      <span className="text-[9px] bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded uppercase font-bold">
                                        {alt.vehicleType}
                                      </span>
                                      {!alt.isValid && (
                                        <span className="text-[8px] bg-red-100 text-red-800 px-1 py-0.5 rounded uppercase font-extrabold">
                                          Invalid
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                      Offer rate: ₹{alt.pricePerKg}/kg ·
                                      Distance: {alt.distanceKm} km
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-extrabold text-slate-800">
                                      Net realized: ₹
                                      {alt.netRealisation.toLocaleString(
                                        "en-IN",
                                      )}
                                    </p>
                                    <p
                                      className={`text-[9px] font-black ${
                                        isBetterNet
                                          ? "text-green-600"
                                          : "text-red-500"
                                      }`}
                                    >
                                      {alt.isValid
                                        ? `${
                                            isBetterNet ? "+" : "−"
                                          } ₹${netDiff.toLocaleString("en-IN")}`
                                        : alt.validationError ||
                                          "Unmet criteria"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Metadata details, Selling window and Data Provenance */}
                  <div className="space-y-6">
                    {/* Selling Window Status */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        Market Context
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black block">
                            National Price Target
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="min-w-fit text-lg font-black text-slate-800">
                              ₹{market?.currentLow} – ₹{market?.currentHigh}
                            </span>
                            <span className="text-xs text-slate-500">/kg</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black block">
                            Local Demand
                          </span>
                          <span className="text-sm font-black text-green-700 mt-1 block">
                            {market?.demand} Demand
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-black block">
                            Active Selling Window
                          </span>
                          <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                            {market?.sellingWindow || "NEUTRAL"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data Provenance Card */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4 text-xs">
                      <h3 className="text-[10px] font-black text-slate-650 uppercase tracking-widest">
                        Data Provenance & Traceability
                      </h3>

                      <div className="space-y-3 font-semibold text-slate-700 font-medium">
                        <div>
                          <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                            Official Mandi Prices
                          </p>
                          <p className="mt-0.5 text-slate-600">
                            Source: Agmarknet Govt Portal
                          </p>
                          <p className="text-[9px] text-[#2e7d3a] font-black uppercase mt-0.5">
                            ✓ Government Verified
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100">
                          <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                            Logistics Costs
                          </p>
                          <p className="mt-0.5 text-slate-600">
                            Source: Estimated System Logistics Rates
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            Estimated Rate
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100">
                          <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                            Buyer Verification
                          </p>
                          <p className="mt-0.5 text-slate-600">
                            Source: Verified Profiles
                          </p>
                          <p className="text-[9px] text-[#2e7d3a] font-black uppercase mt-0.5">
                            ✓ Secure Settlement
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action triggers */}
                    {rec.bestOption && rec.bestOption.type === "BUYER" && (
                      <button
                        onClick={() => {
                          const original = offers.find(
                            (o) => o.id === rec.bestOption?.id,
                          )
                          if (original) {
                            setSelectedOffer(original)
                            setModalVehicleId(
                              rec.bestOption?.transportOptionId || "",
                            )
                          }
                        }}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl text-xs font-black hover:bg-green-700 transition shadow-md cursor-pointer text-center font-black"
                      >
                        ⚡ Accept Recommended Deal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

      {/* --- OFFER DETAILS INSPECTION OVERLAY MODAL --- */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOffer(null)}
              className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full cursor-pointer transition font-bold"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#2e7d3a] tracking-wider uppercase">
                  Buyer Offer Docket
                </span>
                {selectedOffer.id.includes("DEMO") && (
                  <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold uppercase px-1.5 rounded">
                    Demo Data
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-[#122b16] mt-1 flex items-center gap-2">
                {selectedOffer.buyerName}
                {selectedOffer.verified && (
                  <span className="text-base text-green-600">✓</span>
                )}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Docket ID Reference: {selectedOffer.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-550 border-t border-b border-dashed border-slate-100 py-3">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black">
                  Offer price
                </span>
                <span className="text-sm font-black text-[#122b16]">
                  ₹{selectedOffer.offerPricePerKg}/kg
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black">
                  Requested Volume
                </span>
                <span className="text-sm font-black text-[#122b16]">
                  {selectedOffer.quantityKg?.toLocaleString() || lot.quantityKg}{" "}
                  kg
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black">
                  Buyer Verification
                </span>
                <span className="text-sm font-black text-[#2e7d3a]">
                  {selectedOffer.verified ? "Verified ✓" : "Unverified"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black">
                  Distance
                </span>
                <span className="text-sm font-black text-slate-800">
                  {selectedOffer.distanceKm} km away
                </span>
              </div>
            </div>

            {/* Transport Options Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                Available Transport Options
              </h3>
              <div className="grid gap-2">
                {vehicles.map((v) => {
                  const isSuitable = v.capacityKg >= lot.quantityKg
                  const computedCost =
                    v.baseCost + selectedOffer.distanceKm * v.costPerKm
                  const loadUnloadHours =
                    v.id === "tr-mini" ? 3 : v.id === "tr-large" ? 4 : 5
                  const computedTravelHours = Math.round(
                    loadUnloadHours +
                      selectedOffer.distanceKm / v.averageSpeedKmh,
                  )

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (isSuitable) setModalVehicleId(v.id)
                      }}
                      className={`border rounded-2xl p-3 cursor-pointer transition flex items-center justify-between text-xs font-semibold relative ${
                        !isSuitable
                          ? "opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed"
                          : modalVehicleId === v.id
                            ? "border-[#2e7d3a] bg-green-50/20 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900">
                            {v.vehicleType}
                          </p>
                          <span
                            className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase ${
                              isSuitable
                                ? "bg-green-100 text-green-800"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {isSuitable ? "Suitable" : "Not Suitable"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Capacity: {v.capacityKg?.toLocaleString()} kg · ETA:{" "}
                          {computedTravelHours} hrs
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          ₹{computedCost.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[9px] text-[#2e7d3a] uppercase font-bold tracking-wider">
                          {v.availabilityStatus}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* EXPECTED NET REALISATION BREAKDOWN CARD */}
            {(() => {
              const activeVehicle = vehicles.find(
                (v) => v.id === modalVehicleId,
              )
              if (!activeVehicle) return null

              const transportCost =
                activeVehicle.baseCost +
                selectedOffer.distanceKm * activeVehicle.costPerKm
              const breakdown = calculateNetRealisation(
                lot.quantityKg,
                selectedOffer.offerPricePerKg,
                transportCost,
              )

              return (
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                  <div className="text-slate-500 uppercase tracking-widest text-[9px] font-extrabold">
                    Expected Sale breakdown
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-500">Gross Sale Value</span>
                      <span className="text-slate-800 font-extrabold">
                        ₹{breakdown.grossSaleValue.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold text-red-650">
                      <span>Transport Cost (−)</span>
                      <span>
                        − ₹{breakdown.transportCost.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wide">
                            Expected Net Realisation
                          </span>
                          <span className="text-2xl font-black text-green-700">
                            ₹{breakdown.netRealisation.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                            ₹{breakdown.netPricePerKg.toFixed(2)}/kg net
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-150 pt-2 flex flex-col items-start gap-1 text-[10px] text-slate-400 italic">
                    <p>"Transport cost reduces the amount you receive."</p>
                    <p className="not-italic uppercase font-bold tracking-wider text-[8px] text-slate-455 mt-1">
                      PROVENANCE: ESTIMATED VEHICLE LOGISTICS COST AND DEMO
                      OFFER INPUTS
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Actions for active offers */}
            {!selectedOffer.status || selectedOffer.status === "active" ? (
              <div className="flex gap-4 pt-1">
                <button
                  onClick={() => handleRejectOffer(selectedOffer.id)}
                  className="flex-1 py-3 text-red-650 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl text-xs font-bold transition cursor-pointer text-center"
                >
                  ✕ Reject Offer
                </button>
                <button
                  onClick={() => handleAcceptOffer(selectedOffer.id)}
                  className="flex-1 py-3 text-white bg-green-600 hover:bg-green-700 rounded-2xl text-xs font-black shadow-md transition cursor-pointer text-center"
                >
                  ✓ Accept Offer
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-650 rounded-2xl text-center text-xs font-bold uppercase tracking-wider">
                Offer Status: {selectedOffer.status}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
