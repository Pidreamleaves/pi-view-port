// @ts-nocheck
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import AudioViewer from '../AudioViewer.vue'

// Mock Lucide icon
vi.mock('lucide-vue-next', () => ({
  Music: { template: '<svg class="lucide-music"></svg>' }
}))

describe('AudioViewer.vue', () => {
  beforeAll(() => {
    // Polyfill MediaError for JSDOM
    (globalThis as any).MediaError = {
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE: 3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4
    }
    if (!(globalThis as any).URL) {
      (globalThis as any).URL = {}
    }
  })

  beforeEach(() => {
    const url = (globalThis as any).URL ?? {}
    ;(globalThis as any).URL = url
    url.createObjectURL = vi.fn(() => 'blob:mock-url')
    url.revokeObjectURL = vi.fn()
  })

  it('renders audio element and icon correctly', async () => {
    const wrapper = mount(AudioViewer, {
      props: {
        fileUrl: 'test.mp3'
      }
    })
    await wrapper.vm.$nextTick()
    
    // Check icon
    expect(wrapper.find('.audio-icon').exists()).toBe(true)
    
    // Check audio element
    const audio = wrapper.find('audio')
    expect(audio.exists()).toBe(true)
    expect(audio.attributes('src')).toBe('test.mp3')
    
    // Check no video element
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('handles fileData prop correctly', async () => {
    const blob = new Blob([''], { type: 'audio/mpeg' })
    const wrapper = mount(AudioViewer, {
      props: {
        fileData: blob
      }
    })
    await wrapper.vm.$nextTick()
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalledWith(blob)
    const audio = wrapper.find('audio')
    expect(audio.attributes('src')).toBe('blob:mock-url')
  })

  it('emits load-complete on metadata loaded', async () => {
    const wrapper = mount(AudioViewer, {
      props: { fileUrl: 'test.mp3' }
    })
    const audio = wrapper.find('audio')
    
    Object.defineProperty(audio.element, 'duration', { value: 180, configurable: true })
    
    await audio.trigger('loadedmetadata')
    
    expect(wrapper.emitted('load-complete')).toBeTruthy()
    expect(wrapper.emitted('load-complete')?.[0][0]).toEqual({
      type: 'audio',
      duration: 180
    })
  })

  it('emits load-error on error', async () => {
    const wrapper = mount(AudioViewer, {
      props: { fileUrl: 'test.mp3' }
    })
    const audio = wrapper.find('audio')
    
    Object.defineProperty(audio.element, 'error', {
      value: { code: 4 }, // MEDIA_ERR_SRC_NOT_SUPPORTED
      configurable: true
    })
    
    await audio.trigger('error')
    
    expect(wrapper.emitted('load-error')).toBeTruthy()
    const error = wrapper.emitted('load-error')?.[0][0] as any
    expect(error.message).toBe('格式不支持')
  })
})
