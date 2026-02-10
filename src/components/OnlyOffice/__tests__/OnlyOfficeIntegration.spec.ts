import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnlyOfficeDoc from '../OnlyOfficeDoc.vue';
import { ONLYOFFICE_EVENT_KEYS } from '@/utils/onlyoffice';

// Mock objects need to be defined outside to be accessible in tests,
// but for vi.mock hoisting, we need to handle them carefully.
// We will rely on vi.hoisted() or defining them inside the factory if needed,
// but here we want to verify calls on them.
// The error "Cannot access 'mockEditorManager' before initialization" happens because
// vi.mock is hoisted above the variable declaration.

const { mockEditorManager, mockEventBus } = vi.hoisted(() => {
  const mockEventBus = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    trigger: (event: string, data: any) => {
      // @ts-ignore
      const calls = mockEventBus.on.mock.calls;
      const callbacks = calls
        .filter((call: any[]) => call[0] === event)
        .map((call: any[]) => call[1]);
      callbacks.forEach((cb: any) => cb(data));
    }
  };

  return {
    mockEditorManager: {
      getInstanceId: vi.fn(() => 'mock-instance-id'),
      setTheme: vi.fn(),
      setReadOnly: vi.fn(),
      export: vi.fn(),
      destroy: vi.fn(),
    },
    mockEventBus
  };
});

// Mock @/utils/onlyoffice module
vi.mock('@/utils/onlyoffice', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    initializeOnlyOffice: vi.fn().mockResolvedValue(undefined),
    createEditorView: vi.fn().mockResolvedValue(mockEditorManager),
    onlyofficeEventbus: mockEventBus,
    getOnlyOfficeLang: vi.fn(() => 'en'),
  };
});

describe('OnlyOffice Integration', () => {
  const defaultProps = {
    file: new File([''], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    readOnly: true,
    isDark: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. 确保样式切换没问题 (Ensure theme switching works)', async () => {
    const { createEditorView } = await import('@/utils/onlyoffice');
    
    const wrapper = mount(OnlyOfficeDoc, {
      props: defaultProps
    });

    // Wait for onMounted
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify initial call
    expect(createEditorView).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'theme-light'
    }));

    // Switch to dark mode
    await wrapper.setProps({ isDark: true });

    // Verify setTheme was called
    expect(mockEditorManager.setTheme).toHaveBeenCalledWith('theme-dark');

    // Switch back to light mode
    await wrapper.setProps({ isDark: false });
    expect(mockEditorManager.setTheme).toHaveBeenCalledWith('theme-light');
  });

  it('2. 确保office可写性切换没问题 (Ensure read-only switching works)', async () => {
    const { createEditorView } = await import('@/utils/onlyoffice');

    const wrapper = mount(OnlyOfficeDoc, {
      props: { ...defaultProps, readOnly: true }
    });

    // Wait for onMounted
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify initial call
    expect(createEditorView).toHaveBeenCalledWith(expect.objectContaining({
      readOnly: true
    }));

    // Switch to edit mode
    await wrapper.setProps({ readOnly: false });

    // Verify setReadOnly was called
    expect(mockEditorManager.setReadOnly).toHaveBeenCalledWith(false);

    // Switch back to read-only mode
    await wrapper.setProps({ readOnly: true });
    expect(mockEditorManager.setReadOnly).toHaveBeenCalledWith(true);
  });

  it('3. 确保文件修改并保存没问题 (Ensure save and export works)', async () => {
    const wrapper = mount(OnlyOfficeDoc, {
      props: defaultProps
    });

    // Wait for onMounted
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Trigger save method exposed by component
    (wrapper.vm as any).save();

    // Verify export was called on manager
    expect(mockEditorManager.export).toHaveBeenCalled();

    // Simulate save event from EventBus
    const mockSaveData = {
      instanceId: 'mock-instance-id',
      fileName: 'test.docx',
      binData: new Uint8Array([1, 2, 3])
    };

    mockEventBus.trigger(ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT, mockSaveData);

    // Verify component emitted 'save' event
    expect(wrapper.emitted().save).toBeTruthy();
    expect(wrapper.emitted().save![0][0]).toEqual(mockSaveData);
  });
});
