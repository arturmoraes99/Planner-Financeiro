import { memo } from 'react'
import type { MonthlySummary } from '@/types'

interface Props { annualData: MonthlySummary[] }

const W = 860, H = 200, PL = 60, PR = 20, PT = 16, PB = 36
const iW = W - PL - PR
const iH = H - PT - PB

export const AnnualChart = memo(({ annualData }: Props) => {
  if (!annualData.length) {
    return (
      <div className="text-slate-500 text-sm text-center py-8">
        Sem dados anuais disponíveis.
      </div>
    )
  }

  const allV  = annualData.flatMap(d => [d.receitas, d.despesas, Math.abs(d.saldo)])
  const maxV  = Math.max(...allV, 1)
  const minV  = Math.min(...annualData.map(d => d.saldo), 0)
  const range = maxV - minV || 1

  const xP = (i: number) =>
    PL + (i / Math.max(annualData.length - 1, 1)) * iW

  const yP = (v: number) =>
    PT + iH - ((v - minV) / range) * iH

  const makePath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xP(i).toFixed(1)} ${yP(v).toFixed(1)}`)
      .join(' ')

  const LINES = [
    { key: 'receitas', values: annualData.map(d => d.receitas), color: '#22c55e', label: '● Receitas' },
    { key: 'despesas', values: annualData.map(d => d.despesas), color: '#ef4444', label: '● Despesas' },
    { key: 'saldo',    values: annualData.map(d => d.saldo),    color: '#3b82f6', label: '● Saldo'    },
  ]

  const GRID_COUNT = 5
  const gridLines = Array.from({ length: GRID_COUNT }, (_, i) => ({
    yy:  PT + (iH / (GRID_COUNT - 1)) * i,
    val: maxV - (range / (GRID_COUNT - 1)) * i,
  }))

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 500 }}>
        {/* Grid */}
        {gridLines.map(({ yy, val }) => (
          <g key={yy}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy} stroke="#ffffff10" strokeWidth="1" />
            <text x={PL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {(val / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* Linhas e pontos */}
        {LINES.map(({ key, values, color }) => (
          <g key={key}>
            <path
              d={makePath(values)}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {values.map((v, i) => (
              <circle
                key={i}
                cx={xP(i)} cy={yP(v)} r="4"
                fill={color} stroke="#1a2235" strokeWidth="2"
              />
            ))}
          </g>
        ))}

        {/* Labels do eixo X */}
        {annualData.map((d, i) => (
          <text key={i} x={xP(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">
            {d.label}
          </text>
        ))}
      </svg>

      <div className="flex gap-5 mt-3 text-xs">
        {LINES.map(({ key, color, label }) => (
          <span key={key} style={{ color }}>{label}</span>
        ))}
      </div>
    </div>
  )
})

AnnualChart.displayName = 'AnnualChart'
