import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import virtualTemplatePlugin from '@opentiny-internal/unplugin-virtual-template/vite'
import { createVuePlugin as vue2Plugin } from 'vite-plugin-vue2'
import scriptSetupPlugin from 'unplugin-vue2-script-setup/vite'
import { createSvgPlugin as vue2SvgPlugin } from 'vite-plugin-vue2-svg'
import importPlugin from '@opentiny/vue-vite-import'
import { TailwindCSSVitePlugin } from 'tailwindcss-vite-plugin'
import { getAlias } from '../../internals/cli/src/config/vite'

const pathResolve = (...paths: string[]) => path.resolve(__dirname, ...paths).replace(/\\/g, '/')

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), '')

  return {
    plugins: [
      virtualTemplatePlugin({ include: ['**/packages/vue/**/src/index.ts'], env }),
      vue2Plugin({
        jsx: true,
        include: [/\.vue$/, /\.md$/],
      }),
      scriptSetupPlugin(),
      vue2SvgPlugin(),
      importPlugin([
        {
          libraryName: '@opentiny/vue'
        },
        ...['icon', 'icon-saas'].map(lib => ({
          libraryName: `@opentiny/vue-${lib}`,
          customName: (name: string) => {
            return name === 'default' ? `@opentiny/vue-${lib}$` : `@opentiny/vue-${lib}/${name.replace(/^icon-/, '')}`
          }
        }))
      ]),
      TailwindCSSVitePlugin({
        config: pathResolve('tailwind.config.cjs'),
        entry: pathResolve('src/index.css')
      })
    ],
    optimizeDeps: {
      disabled: true,
    },
    define: {
      'process.env': env,
    },
    test: {
      open: false,
      clearMocks: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      transformMode: {
        web: [/\.[jt]sx$/],
      },
      include: [
        '../../packages/vue/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
      ],
      exclude: [
        '../../packages/vue/src/**/{node_modules,dist}/**',
      ],
      alias: {
        '@vue/composition-api': path.resolve('node_modules/@vue/composition-api'),
        'vue': path.resolve('node_modules/vue/dist/vue.esm.js'),
        '@vue/test-utils': path.resolve('node_modules/@vue/test-utils'),
        ...getAlias(2),
      }
    },
  }
})
