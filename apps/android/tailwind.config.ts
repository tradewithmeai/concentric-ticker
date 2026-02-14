import baseConfig from '../../tailwind.config.base'
import type { Config } from 'tailwindcss'

export default {
  ...baseConfig,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/shared/src/**/*.{ts,tsx}',
  ],
} satisfies Config
