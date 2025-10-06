// lib/designTokens.ts
export const colors = {
  // Dark mode background
  background: {
    primary: '#0f172a',      // slate-900
    secondary: '#1e293b',    // slate-800
    tertiary: '#334155',     // slate-700
  },
  
  // Success gradient (for active pipeline stages)
  success: {
    start: '#10b981',        // emerald-500
    end: '#14b8a6',          // teal-500
    glow: '#10b98133',       // emerald-500 with 20% opacity
  },
  
  // Warning gradient (for paused states)
  warning: {
    start: '#f59e0b',        // amber-500
    end: '#f97316',          // orange-500
    glow: '#f59e0b33',
  },
  
  // Danger gradient (for closed/drop-off)
  danger: {
    start: '#f97316',        // orange-500
    end: '#ef4444',          // red-500
    glow: '#ef444433',
  },
  
  // Accent gradients (for specific stages)
  accent: {
    indigo: {
      start: '#6366f1',      // indigo-500
      end: '#8b5cf6',        // purple-500
    },
    cyan: {
      start: '#06b6d4',      // cyan-500
      end: '#3b82f6',        // blue-500
    }
  },
  
  // Text colors
  text: {
    primary: '#f1f5f9',      // slate-100
    secondary: '#cbd5e1',    // slate-300
    tertiary: '#94a3b8',     // slate-400
    muted: '#64748b',        // slate-500
  },
  
  // UI elements
  border: '#334155',         // slate-700
  borderLight: '#475569',    // slate-600
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  glow: '0 0 20px rgb(16 185 129 / 0.3)',
  glowDanger: '0 0 20px rgb(239 68 68 / 0.3)',
  glowWarning: '0 0 20px rgb(245 158 11 / 0.3)',
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
  },
  
  fontSize: {
    xs: '0.6875rem',    // 11px
    sm: '0.75rem',      // 12px
    base: '0.875rem',   // 14px
    lg: '1rem',         // 16px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '2rem',      // 32px
    '4xl': '2.5rem',    // 40px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
  },
} as const;

// Helper function to create gradient definitions for SVG
export const createGradientId = (name: string) => `gradient-${name}`;

export const gradients = {
  success: { start: colors.success.start, end: colors.success.end },
  warning: { start: colors.warning.start, end: colors.warning.end },
  danger: { start: colors.danger.start, end: colors.danger.end },
  indigo: { start: colors.accent.indigo.start, end: colors.accent.indigo.end },
  cyan: { start: colors.accent.cyan.start, end: colors.accent.cyan.end },
} as const;

