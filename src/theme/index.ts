import type { App, InjectionKey } from 'vue'
import { inject } from 'vue'

export type ViewerThemeMode = 'light' | 'dark'

export interface ViewerTheme {
  mode?: ViewerThemeMode
  isDark?: boolean
}

export const VIEWER_THEME_KEY: InjectionKey<ViewerTheme> = Symbol('PI_VIEW_PORT_THEME')

export const provideViewerTheme = (app: App, theme: ViewerTheme) => {
  app.provide(VIEWER_THEME_KEY, theme)
}

export const useViewerTheme = () => inject(VIEWER_THEME_KEY, undefined)
