import { useEffect, useState } from "react"
import {
  fetchTrustSummaryForRole,
  type TrustRole,
  type TrustSummary,
} from "../lib/trust"

interface TrustScoreCardProps {
  role: TrustRole
  phone: string
  title: string
  helperText?: string
}

export default function TrustScoreCard({
  role,
  phone,
  title,
  helperText,
}: TrustScoreCardProps) {
  const [summary, setSummary] = useState<TrustSummary | null>(null)

  useEffect(() => {
    let ignore = false

    fetchTrustSummaryForRole(role, phone)
      .then((result) => {
        if (!ignore) setSummary(result)
      })
      .catch(() => {
        if (!ignore) setSummary(null)
      })

    return () => {
      ignore = true
    }
  }, [role, phone])

  if (!summary) {
    return (
      <div className="rounded-3xl border border-agri-100 bg-white p-5 shadow-sm">
        <div className="h-4 w-24 rounded bg-agri-100 animate-pulse mb-3" />
        <div className="h-10 w-32 rounded bg-agri-50 animate-pulse mb-3" />
        <div className="h-3 w-full rounded bg-agri-50 animate-pulse" />
      </div>
    )
  }

  const scoreDisplay = summary.score === null ? "TRUST SCORE" : `${summary.score} / 100`
  const category = summary.category ?? "LOW TRUST"

  return (
    <div className="rounded-3xl border border-agri-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-agri-500 uppercase">
            {title}
          </p>
          <p className="mt-2 text-4xl font-extrabold text-agri-950">
            {summary.score === null ? "—" : summary.score}
          </p>
        </div>
        <div className="rounded-full bg-agri-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-agri-700">
          {summary.score === null ? "No history" : category}
        </div>
      </div>

      {summary.score !== null ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{scoreDisplay}</span>
            <span>{summary.basisText}</span>
          </div>
          {summary.breakdown.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{item.label}</span>
                <span>
                  {item.earned}/{item.max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-agri-500"
                  style={{
                    width: `${(item.earned / item.max) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{summary.basisText}</p>
      )}

      {summary.badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {helperText ? <p className="mt-4 text-xs text-slate-500">{helperText}</p> : null}
    </div>
  )
}
