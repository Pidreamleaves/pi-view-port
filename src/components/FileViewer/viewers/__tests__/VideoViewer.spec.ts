// @ts-nocheck
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import VideoViewer from '../VideoViewer.vue'

describe('VideoViewer.vue', () => {
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

  it('renders video element correctly', async () => {
    const wrapper = mount(VideoViewer, {
      props: {
        fileUrl: 'test.mp4'
      }
    })
    await wrapper.vm.$nextTick()
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('test.mp4')
  })

  it('handles fileData prop correctly', async () => {
    const blob = new Blob([''], { type: 'video/mp4' })
    const wrapper = mount(VideoViewer, {
      props: {
        fileData: blob
      }
    })
    await wrapper.vm.$nextTick()
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalledWith(blob)
    const video = wrapper.find('video')
    expect(video.attributes('src')).toBe('blob:mock-url')
  })

  it('emits load-complete on metadata loaded', async () => {
    const wrapper = mount(VideoViewer, {
      props: { fileUrl: 'test.mp4' }
    })
    const video = wrapper.find('video')
    
    Object.defineProperty(video.element, 'duration', { value: 100, configurable: true })
    Object.defineProperty(video.element, 'videoWidth', { value: 1920, configurable: true })
    Object.defineProperty(video.element, 'videoHeight', { value: 1080, configurable: true })
    
    await video.trigger('loadedmetadata')
    
    expect(wrapper.emitted('load-complete')).toBeTruthy()
    expect(wrapper.emitted('load-complete')?.[0][0]).toEqual({
      type: 'video',
      duration: 100,
      width: 1920,
      height: 1080
    })
  })

  it('emits load-error on error', async () => {
    const wrapper = mount(VideoViewer, {
      props: { fileUrl: 'test.mp4' }
    })
    const video = wrapper.find('video')
    
    Object.defineProperty(video.element, 'error', {
      value: { code: 4 }, // MEDIA_ERR_SRC_NOT_SUPPORTED
      configurable: true
    })
    
    await video.trigger('error')
    
    expect(wrapper.emitted('load-error')).toBeTruthy()
    const error = wrapper.emitted('load-error')?.[0][0] as any
    expect(error.message).toBe('格式不支持')
  })
})
