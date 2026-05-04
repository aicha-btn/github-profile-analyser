export interface TechVisual {
  background: string
  border: string
  color: string
  iconUrl: string | null
  shortLabel: string
}

const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

const TECH_VISUALS: Record<string, Omit<TechVisual, 'shortLabel'>> = {
  typescript: {
    background: 'rgba(49, 120, 198, 0.14)',
    border: 'rgba(49, 120, 198, 0.22)',
    color: '#14548f',
    iconUrl: `${DEVICON_BASE}/typescript/typescript-original.svg`,
  },
  javascript: {
    background: 'rgba(240, 219, 79, 0.24)',
    border: 'rgba(193, 172, 32, 0.26)',
    color: '#5f4d00',
    iconUrl: `${DEVICON_BASE}/javascript/javascript-original.svg`,
  },
  python: {
    background: 'linear-gradient(135deg, rgba(55, 118, 171, 0.16), rgba(255, 212, 59, 0.18))',
    border: 'rgba(55, 118, 171, 0.22)',
    color: '#245175',
    iconUrl: `${DEVICON_BASE}/python/python-original.svg`,
  },
  php: {
    background: 'rgba(119, 123, 179, 0.16)',
    border: 'rgba(119, 123, 179, 0.24)',
    color: '#5b5f96',
    iconUrl: `${DEVICON_BASE}/php/php-original.svg`,
  },
  react: {
    background: 'rgba(97, 218, 251, 0.18)',
    border: 'rgba(97, 218, 251, 0.24)',
    color: '#0d6d82',
    iconUrl: `${DEVICON_BASE}/react/react-original.svg`,
  },
  css: {
    background: 'rgba(38, 77, 228, 0.12)',
    border: 'rgba(38, 77, 228, 0.2)',
    color: '#1e4fae',
    iconUrl: `${DEVICON_BASE}/css3/css3-original.svg`,
  },
  html: {
    background: 'rgba(227, 79, 38, 0.12)',
    border: 'rgba(227, 79, 38, 0.18)',
    color: '#b54823',
    iconUrl: `${DEVICON_BASE}/html5/html5-original.svg`,
  },
  nodejs: {
    background: 'rgba(104, 160, 99, 0.14)',
    border: 'rgba(104, 160, 99, 0.24)',
    color: '#336930',
    iconUrl: `${DEVICON_BASE}/nodejs/nodejs-original.svg`,
  },
  nextjs: {
    background: 'rgba(17, 24, 39, 0.08)',
    border: 'rgba(17, 24, 39, 0.14)',
    color: '#111827',
    iconUrl: `${DEVICON_BASE}/nextjs/nextjs-original.svg`,
  },
  vite: {
    background: 'linear-gradient(135deg, rgba(116, 88, 255, 0.14), rgba(255, 194, 71, 0.16))',
    border: 'rgba(116, 88, 255, 0.2)',
    color: '#5b44c8',
    iconUrl: `${DEVICON_BASE}/vitejs/vitejs-original.svg`,
  },
  tailwind: {
    background: 'rgba(56, 189, 248, 0.14)',
    border: 'rgba(14, 165, 233, 0.18)',
    color: '#036f96',
    iconUrl: `${DEVICON_BASE}/tailwindcss/tailwindcss-original.svg`,
  },
  vuejs: {
    background: 'rgba(65, 184, 131, 0.14)',
    border: 'rgba(65, 184, 131, 0.22)',
    color: '#1f7a57',
    iconUrl: `${DEVICON_BASE}/vuejs/vuejs-original.svg`,
  },
  markdown: {
    background: 'rgba(51, 65, 85, 0.1)',
    border: 'rgba(51, 65, 85, 0.16)',
    color: '#334155',
    iconUrl: `${DEVICON_BASE}/markdown/markdown-original.svg`,
  },
  bash: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.2)',
    color: '#0f766e',
    iconUrl: `${DEVICON_BASE}/bash/bash-original.svg`,
  },
  java: {
    background: 'rgba(237, 108, 2, 0.12)',
    border: 'rgba(237, 108, 2, 0.18)',
    color: '#b45309',
    iconUrl: `${DEVICON_BASE}/java/java-original.svg`,
  },
  csharp: {
    background: 'rgba(124, 58, 237, 0.14)',
    border: 'rgba(124, 58, 237, 0.2)',
    color: '#6d28d9',
    iconUrl: `${DEVICON_BASE}/csharp/csharp-original.svg`,
  },
  cplusplus: {
    background: 'rgba(0, 89, 156, 0.12)',
    border: 'rgba(0, 89, 156, 0.18)',
    color: '#00599c',
    iconUrl: `${DEVICON_BASE}/cplusplus/cplusplus-original.svg`,
  },
  go: {
    background: 'rgba(0, 173, 216, 0.14)',
    border: 'rgba(0, 173, 216, 0.2)',
    color: '#036c85',
    iconUrl: `${DEVICON_BASE}/go/go-original.svg`,
  },
}

const TECH_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  'node.js': 'nodejs',
  node: 'nodejs',
  next: 'nextjs',
  'next.js': 'nextjs',
  tailwindcss: 'tailwind',
  tailwind: 'tailwind',
  vue: 'vuejs',
  vuejs: 'vuejs',
  md: 'markdown',
  markdown: 'markdown',
  shell: 'bash',
  sh: 'bash',
  bash: 'bash',
  'c#': 'csharp',
  'c++': 'cplusplus',
  css: 'css',
  html: 'html',
  api: 'api',
  frontend: 'frontend',
}

function normalizeKey(label: string): string {
  const normalizedLabel = label.trim().toLowerCase()
  return TECH_ALIASES[normalizedLabel] ?? normalizedLabel
}

function toShortLabel(label: string): string {
  const compact = label.replace(/[^a-z0-9+.#]/gi, '')

  if (compact.length <= 2) {
    return compact.toUpperCase()
  }

  return compact.slice(0, 2).toUpperCase()
}

function createFallbackVisual(label: string): Omit<TechVisual, 'shortLabel'> {
  const seed = Array.from(label).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const hue = 190 + (seed % 70)

  return {
    background: `hsla(${hue} 70% 95% / 1)`,
    border: `hsla(${hue} 55% 72% / 1)`,
    color: `hsl(${hue} 65% 30%)`,
    iconUrl: null,
  }
}

export function getTechVisual(label: string): TechVisual {
  const normalizedKey = normalizeKey(label)
  const visual = TECH_VISUALS[normalizedKey] ?? createFallbackVisual(label)

  return {
    ...visual,
    shortLabel: toShortLabel(label),
  }
}

