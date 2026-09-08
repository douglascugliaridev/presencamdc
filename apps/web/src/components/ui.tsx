import type { ReactNode } from 'react'

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-text-dark">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-[#7F1414]',
    secondary: 'bg-secondary text-white hover:opacity-90',
    danger: 'bg-danger text-white hover:bg-[#B91C1C]',
    success: 'bg-success text-white hover:opacity-90',
    ghost: 'border border-gray-300 text-text-dark hover:bg-gray-50',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text-gray">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function Badge({ children, tone }: { children: ReactNode; tone: 'red' | 'yellow' | 'green' | 'gray' }) {
  const tones = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-text-gray hover:text-text-dark">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-text-gray">{children}</p>
}