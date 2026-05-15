interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'full' | 'icon'
}

export function Logo({ size = 'md', showText = true, variant = 'full' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', plus: 'text-sm' },
    md: { icon: 'w-10 h-10', text: 'text-xl', plus: 'text-base' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', plus: 'text-lg' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl', plus: 'text-2xl' },
  }

  const IconLogo = () => (
    <svg
      viewBox="0 0 100 100"
      className={sizes[size].icon}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Definição do gradiente */}
      <defs>
        <linearGradient id="greenGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id="darkGreenGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Forma do P estilizado (contorno curvo) */}
      <path
        d="M20 85 L20 25 Q20 10 35 10 L55 10 Q80 10 80 35 Q80 55 60 60 L45 60"
        stroke="url(#greenGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Barras de crescimento */}
      <rect x="30" y="55" width="8" height="20" rx="2" fill="url(#darkGreenGradient)" />
      <rect x="42" y="45" width="8" height="30" rx="2" fill="url(#greenGradient)" />
      <rect x="54" y="35" width="8" height="40" rx="2" fill="#22C55E" />

      {/* Símbolo + */}
      <g fill="#22C55E">
        <rect x="75" y="5" width="4" height="16" rx="2" />
        <rect x="69" y="11" width="16" height="4" rx="2" />
      </g>
    </svg>
  )

  if (variant === 'icon') {
    return <IconLogo />
  }

  return (
    <div className="flex items-center gap-3">
      <IconLogo />
      {showText && (
        <span className={`${sizes[size].text} font-semibold tracking-tight`}>
          <span className="text-gray-800">Planeja</span>
          <span className="text-primary-500 font-bold">+</span>
        </span>
      )}
    </div>
  )
}
