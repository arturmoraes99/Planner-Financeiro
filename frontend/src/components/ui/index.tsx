import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ── Button ────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-700 hover:bg-blue-600 text-white',
  danger:  'bg-red-700 hover:bg-red-600 text-white',
  success: 'bg-green-700 hover:bg-green-600 text-white',
  ghost:   'bg-white/5 hover:bg-white/10 text-slate-300',
  outline: 'border border-slate-600 hover:bg-white/5 text-slate-300',
}

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'rounded-xl font-semibold transition-all inline-flex items-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl p-6 border border-white/10', className)}
      style={{ background: '#1a2235', ...style }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-xs text-blue-400 uppercase font-bold tracking-wider mb-4', className)}>
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────
const INPUT_BASE =
  'w-full rounded-xl px-4 py-3 text-sm outline-none border border-slate-700 focus:border-blue-500 transition-colors'
const INPUT_STYLE = { background: '#0a0f1e', color: '#e2e8f0' }

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={cn(INPUT_BASE, error && 'border-red-500', className)}
        style={INPUT_STYLE}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={cn(INPUT_BASE, 'cursor-pointer', className)}
        style={{ ...INPUT_STYLE, backgroundImage: 'none' }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center px-4 py-6 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`rounded-2xl p-6 border border-white/10 w-full ${maxWidth}`}
        style={{ background: '#1a2235' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-blue-400 font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────
interface ToastProps {
  msg: string
  type: 'ok' | 'err' | 'info'
  visible: boolean
}

export function Toast({ msg, type, visible }: ToastProps) {
  if (!visible) return null
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl font-bold text-sm shadow-xl border',
        'transition-all duration-300',
        type === 'ok'   && 'bg-green-900 text-green-300 border-green-500',
        type === 'err'  && 'bg-red-900 text-red-300 border-red-500',
        type === 'info' && 'bg-slate-800 text-slate-300 border-slate-600',
      )}
    >
      {msg}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode
  variant?: 'green' | 'red' | 'blue' | 'yellow'
}

const BADGE_VARIANTS = {
  green:  'bg-green-900/60 text-green-400 border-green-800',
  red:    'bg-red-900/40 text-red-400 border-red-800',
  blue:   'bg-blue-900/60 text-blue-400 border-blue-800',
  yellow: 'bg-yellow-900/60 text-yellow-400 border-yellow-800',
}

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border', BADGE_VARIANTS[variant])}>
      {children}
    </span>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-slate-500 text-sm text-center py-8">{message}</div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="text-slate-500 text-sm text-center py-8 animate-pulse">{text}</div>
  )
}