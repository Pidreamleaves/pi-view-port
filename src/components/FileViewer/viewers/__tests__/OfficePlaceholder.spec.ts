import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import OfficePlaceholder from '../OfficePlaceholder.vue'
import OnlyOfficeDoc from '@/components/OnlyOffice/OnlyOfficeDoc.vue'

// Mock OnlyOffice components
vi.mock('@/components/OnlyOffice/OnlyOfficeDoc.vue', () => ({
  default: {
    name: 'OnlyOfficeDoc',
    props: ['readOnly', 'file'],
    template: '<div class="onlyoffice-doc-mock"></div>'
  }
}))

vi.mock('@/components/OnlyOffice/OnlyOfficePpt.vue', () => ({
  default: {
    name: 'OnlyOfficePpt',
    template: '<div></div>'
  }
}))

vi.mock('@/components/OnlyOffice/OnlyOfficeXls.vue', () => ({
  default: {
    name: 'OnlyOfficeXls',
    template: '<div></div>'
  }
}))

describe('OfficePlaceholder.vue', () => {
  const mockFile = new File([''], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  it('renders placeholder when no file is provided', () => {
    const wrapper = mount(OfficePlaceholder)
    expect(wrapper.find('.office-placeholder').exists()).toBe(true)
  })

  it('sets readOnly to true by default', async () => {
    const wrapper = mount(OfficePlaceholder, {
      props: {
        fileName: 'test.docx',
        fileData: mockFile
      }
    })
    
    // Wait for async initFile
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    const docComponent = wrapper.findComponent(OnlyOfficeDoc)
    expect(docComponent.exists()).toBe(true)
    expect(docComponent.props('readOnly')).toBe(true)
  })

  it('sets readOnly to false when editable is true', async () => {
    const wrapper = mount(OfficePlaceholder, {
      props: {
        fileName: 'test.docx',
        fileData: mockFile,
        officeConfig: {
          editable: true
        }
      }
    })

    // Wait for async initFile
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    const docComponent = wrapper.findComponent(OnlyOfficeDoc)
    expect(docComponent.exists()).toBe(true)
    expect(docComponent.props('readOnly')).toBe(false)
  })

  it('sets readOnly to true when editable is explicitly false', async () => {
    const wrapper = mount(OfficePlaceholder, {
      props: {
        fileName: 'test.docx',
        fileData: mockFile,
        officeConfig: {
          editable: false
        }
      }
    })

    // Wait for async initFile
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    const docComponent = wrapper.findComponent(OnlyOfficeDoc)
    expect(docComponent.exists()).toBe(true)
    expect(docComponent.props('readOnly')).toBe(true)
  })
})
