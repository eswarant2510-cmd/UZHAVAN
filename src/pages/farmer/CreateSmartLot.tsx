import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { farmerApi, getCropImageFor } from "../../services/farmerApi"
import { getAuthProfile } from "../../lib/auth"

export default function CreateSmartLot() {
  const navigate = useNavigate()
  const [crop, setCrop] = useState("Tomato")
  const [variety, setVariety] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [unit, setUnit] = useState("kg")
  const [harvestDate, setHarvestDate] = useState("")
  const [sellDate, setSellDate] = useState("")
  const [location, setLocation] = useState("")
  const [minPrice, setMinPrice] = useState<number | "">("")
  const [photos, setPhotos] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cropPreviewImage = getCropImageFor(crop)

  useEffect(() => {
    // Populate user's default location if available
    getAuthProfile().then((profile) => {
      if (profile?.location) {
        setLocation(profile.location)
      }
    })
  }, [])

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      // Validate file size (limit base64 storage payload to avoid excessive DB rows sizes)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!crop) {
      setError("Please select a crop")
      return
    }
    if (!quantity || quantity <= 0) {
      setError("Please enter a valid quantity")
      return
    }
    if (!location.trim()) {
      setError("Please enter the lot's storage location")
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
    const newLotId = "LW" + Math.floor(100 + Math.random() * 900)

    const fallbackImg = getCropImageFor(crop)

    const payload = {
      id: newLotId,
      crop,
      variety,
      quantityKg: Number(quantity),
      unit,
      imageUrl: photos[0] || fallbackImg,
      photos: photos.length > 0 ? photos : [fallbackImg],
      location,
      expectedNetPerKg: Number(minPrice) || 0,
      minPricePerKg: Number(minPrice) || 0,
      status: "active" as const,
      harvestDate,
      expectedSellingDate: sellDate,
    }

    try {
      await farmerApi.createLot(payload)
      setSaving(false)
      navigate("/farmer/lots")
    } catch (err: any) {
      setError(err.message || "Failed to create lot in Supabase.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto font-sans p-2">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-[#2e7d3a] transition cursor-pointer"
          aria-label="Go back"
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
          <h1 className="text-2xl font-extrabold text-[#122b16]">
            Create Smart Lot
          </h1>
          <p className="text-xs text-slate-500">
            Formulate your produce details to share with target buyers and
            transporters
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#a7e4b0]/70 rounded-3xl p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-3xl border border-[#a7e4b0] bg-[#edf9f0] shadow-sm">
          <div className="relative h-48 sm:h-56">
            <img
              src={photos[0] || cropPreviewImage}
              alt={crop}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-4 text-white">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-100">
                  Crop Preview
                </div>
                <div className="text-xl font-extrabold tracking-wide">{crop}</div>
              </div>
              <div className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
                {photos.length > 0 ? "Custom image" : "Default image"}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Crop Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Crop
              </label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
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

            {/* Variety */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Variety
              </label>
              <input
                type="text"
                placeholder="e.g. F1 Hybrid, Desi, Red Rock"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Quantity
              </label>
              <input
                type="number"
                min={0}
                placeholder="Enter stock quantity"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="quintals">quintals (100 kg)</option>
                <option value="tonnes">tonnes (1,000 kg)</option>
                <option value="crates">crates</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Storage Location
            </label>
            <input
              type="text"
              placeholder="e.g. Nashik, Maharashtra"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Harvest Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Harvest Date
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
              />
            </div>

            {/* Available Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Selling / Available Date
              </label>
              <input
                type="date"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
              />
            </div>
          </div>

          {/* Minimum Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Minimum Acceptable Price (₹ per kg){" "}
              <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 24"
              value={minPrice}
              onChange={(e) =>
                setMinPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Produce Photos{" "}
              <span className="text-slate-400 font-normal">(Optional)</span>
            </label>

            <div className="mt-2 flex flex-wrap gap-4">
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#a7e4b0] hover:border-green-600 transition flex flex-col items-center justify-center cursor-pointer bg-[#edf9f0]/40 shrink-0 text-slate-500">
                <span className="text-2xl">📸</span>
                <span className="text-[10px] font-bold mt-1">Add Photo</span>
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
                  className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#a7e4b0] shrink-0 group"
                >
                  <img
                    src={u}
                    alt={`preview-${i}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-750 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold transition text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl text-white font-extrabold transition text-sm cursor-pointer shadow-md"
              style={{
                background: saving
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #2e7d3a 0%, #3da64e 100%)",
              }}
            >
              {saving ? "Saving Lot..." : "💾 Save to Supabase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
