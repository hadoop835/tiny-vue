import type { ConfigProviderProps } from '../src/props'
import { configProviderContextKey } from '../index'
import { hooks } from '@opentiny/vue-common/src'

export function useConfig(): ConfigProviderProps | {} {
  return hooks.inject(configProviderContextKey) ?? {}
}
