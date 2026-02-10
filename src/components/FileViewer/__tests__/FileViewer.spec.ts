import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FileViewer from '../FileViewer.vue'

describe('FileViewer.vue', () => {
  it('resolves theme from theme prop', async () => {
    const wrapper = mount(FileViewer, {
      props: {
        fileType: 'unknown',
        theme: 'dark'
      }
    })
    await wrapper.vm.$nextTick()
    const root = wrapper.find('.fv-file-viewer')
    expect(root.attributes('data-fv-theme')).toBe('dark')
    expect(root.classes()).toContain('fv-style-default')
  })

  it('disables default styles when useDefaultStyles is false', async () => {
    const wrapper = mount(FileViewer, {
      props: {
        fileType: 'unknown',
        useDefaultStyles: false,
        theme: 'dark'
      }
    })
    await wrapper.vm.$nextTick()
    const root = wrapper.find('.fv-file-viewer')
    expect(root.attributes('data-fv-theme')).toBe('dark')
    expect(root.classes()).not.toContain('fv-style-default')
  })

  it('resolves theme from theme prop', async () => {
    const wrapper = mount(FileViewer, {
      props: {
        fileType: 'unknown',
        theme: 'dark'
      }
    })
    await wrapper.vm.$nextTick()
    const root = wrapper.find('.fv-file-viewer')
    expect(root.attributes('data-fv-theme')).toBe('dark')
  })

  it('passes officeConfig to OfficePlaceholder', async () => {
    // Mock OfficePlaceholder component
    const OfficePlaceholder = {
      name: 'OfficePlaceholder',
      props: ['officeConfig'],
      template: '<div class="office-placeholder-mock"></div>'
    }

    const wrapper = mount(FileViewer, {
      props: {
        fileType: 'office',
        officeConfig: { editable: true }
      },
      global: {
        stubs: {
          OfficePlaceholder: OfficePlaceholder
        }
      }
    })

    // Wait for dynamic component loading
    await wrapper.vm.$nextTick()
    // Need a bit more time for defineAsyncComponent to resolve
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    const placeholder = wrapper.findComponent({ name: 'OfficePlaceholder' })
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.props('officeConfig')).toEqual({ editable: true })
  })
})
