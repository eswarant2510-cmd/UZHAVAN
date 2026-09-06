import { useState, useEffect } from "react"
import { calculateUserTrustScore, type UserTrustMetrics } from "../../services/trustEngineService"

interface TrustScoreCardProps {
  userPhone: string
  role: "farmer" | "buyer" | "transporter"
  compact?: boolean
}

export default function TrustScoreCard({ userPhone, role, compact = false }: TrustScoreCardProps) {
  const [metrics, setMetrics] = useState<UserTrustMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function loadTrust() {
      if (!userPhone) {
        setLoading(false)
        return
      }
      const data = await calculateUserTrustScore(userPhone, role)
      if (alive) {
        setMetrics(data)
        setLoading(false)
      }
    }
    loadTrust()
    return () => {
      alive = false
    }
  }, [userPhone, role])

  if (loading) {
    return <div className="h-14 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
  }

  if (!metrics || !metrics.hasEnoughData) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            🛡️ UZHAVAN TRUST ENGINE
          </span>
          <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
            New Member
          </span>
        </div>
        <p className="text-xs font-bold text-slate-700">Insufficient Platform History</p>
        <p className="text-[11px] text-slate-500 font-medium">
          Trust score calculates automatically after first verified transaction & delivery.
        </p>
      </div>
    )
  }

  const badgeColors = {
    "Highly Reliable": "bg-emerald-100 text-emerald-800 border-emerald-300",
    Reliable: "bg-green-100 text-green-800 border-green-300",
    Developing: "bg-amber-100 text-amber-800 border-amber-300",
    "Needs Improvement": "bg-red-100 text-red-800 border-red-300",
    "New / Insufficient Data": "bg-slate-100 text-slate-600 border-slate-300",
  }[metrics.trustLevel]

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
        <span className="text-emerald-900 font-black">🛡️ Trust: {metrics.score}/100</span>
        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border ${badgeColors}`}>
          {metrics.trustLevel}
        </span>
        <span className="text-[10px] text-slate-500 font-semibold">({metrics.totalEvidenceCount} verified)</span>
      </div>
    )
  }

  return (
    <div className="p-5 bg-gradient-to-br from-white to-slate-50 border border-emerald-150 rounded-3xl space-y-3.5 shadow-xs font-sans">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
            🛡️ UZHAVAN PLATFORM TRUST ENGINE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{metrics.score}</span>
            <span className="text-xs text-slate-400 font-extrabold">/ 100</span>
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${badgeColors}`}>
              {metrics.trustLevel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Evidence Count</span>
          <span className="text-sm font-black text-slate-800">{metrics.totalEvidenceCount} Orders</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-3">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Successful</span>
          <span className="font-extrabold text-emerald-700">✓ {metrics.completedCount} Orders</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Matched Receipts</span>
          <span className="font-extrabold text-slate-800">{metrics.matchedCount} Dockets</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Quantity Accuracy</span>
          <span className="font-extrabold text-slate-800">{metrics.quantityAccuracyPct}%</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Open Disputes</span>
          <span className={`font-extrabold ${metrics.openDisputeCount > 0 ? "text-red-600" : "text-slate-700"}`}>
            {metrics.openDisputeCount}
          </span>
        </div>
      </div>

      {metrics.explanations.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-100 text-[10.5px] space-y-1">
          <span className="font-black text-slate-500 uppercase text-[9px] block">Transparent Score Factors</span>
          {metrics.explanations.map((exp, idx) => (
            <p key={idx} className="text-slate-700 font-medium">
              • {exp}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
