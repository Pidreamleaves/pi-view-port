import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorManager } from '../editor-manager';

// Mock dependencies
const { mockCreateEditorInstance, mockEventBus } = vi.hoisted(() => {
  return {
    mockCreateEditorInstance: vi.fn(),
    mockEventBus: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  };
});

vi.mock('../x2t', () => ({
  createEditorInstance: mockCreateEditorInstance
}));

vi.mock('../eventbus', () => ({
  onlyofficeEventbus: mockEventBus
}));

vi.mock('../document-state', () => ({
  getOnlyOfficeLang: vi.fn(() => 'en')
}));

describe('EditorManager', () => {
  let manager: EditorManager;
  const mockEditor = {
    destroyEditor: vi.fn(),
    sendCommand: vi.fn(),
    setTheme: vi.fn(), // Mock method that might exist on editor
    downloadAs: vi.fn(), // Needed for export during reload
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new EditorManager('test-container');
    
    // Setup initial state manually since we can't easily trigger create() fully in isolation
    // calling create with our mock editor
    manager.create(mockEditor as any, {
      fileName: 'test.docx',
      fileType: 'docx',
      binData: new ArrayBuffer(0),
      theme: 'theme-light',
      readOnly: false
    });
    
    // Clear mocks after create() call since it might trigger things
    vi.clearAllMocks();
  });

  it('setTheme should force reload in WASM mode', async () => {
    // We need to simulate the async export process during reload
    // Mock export to resolve immediately or mock downloadAs to trigger the event
    
    // Since we are calling setTheme, it calls reload, which calls export.
    // export calls downloadAs.
    // We need to ensure export doesn't throw or hang.
    
    // Simulating event bus save event when downloadAs is called
    mockEditor.downloadAs.mockImplementation(() => {
       const instanceId = manager.getInstanceId();
       
       // Manually find the handler registered via on()
       // Since we mock on(), we need to check calls
       // NOTE: In the implementation, on() is called BEFORE downloadAs().
       // So it should be present in the mock calls.
       const calls = mockEventBus.on.mock.calls;
       
       calls.forEach((call: any[]) => {
         // Use correct event key 'saveDocument' (value of ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT)
         if (call[0] === 'saveDocument') {
             // The handler expects data
             call[1]({ 
               instanceId, 
               fileName: 'test.docx', 
               fileType: 'docx',
               binData: new Uint8Array(0)
             });
         }
       });
    });

    // Act
    // setTheme is synchronous but calls reload which is async internally but not awaited.
    // However, reload catches errors.
    // We need to await the promise if we could access it, but we can't easily.
    // But since we mock everything to be synchronous/immediate resolution:
    
    manager.setTheme('theme-dark');
    
    // We need to wait for promises to resolve
    // The export() method has an await inside, so reload pauses there.
    // By the time we hit setTimeout 0, the export promise chain should proceed IF the event fired synchronously.
    await new Promise(resolve => setTimeout(resolve, 10));

    // Assert
    // 1. Should NOT call editor.setTheme (because we commented it out to force reload)
    expect(mockEditor.setTheme).not.toHaveBeenCalled();

    // 2. Should call createEditorInstance (indicating a reload happened)
    expect(mockCreateEditorInstance).toHaveBeenCalledTimes(1);
    
    // 3. Verify reload arguments
    const reloadCallArgs = mockCreateEditorInstance.mock.calls[0][0];
    expect(reloadCallArgs).toMatchObject({
      fileName: 'test.docx',
      theme: 'theme-dark', // The new theme
      editorManager: manager
    });
  });

  it('setTheme should update internal config', async () => {
    // Setup mock for export as above
    mockEditor.downloadAs.mockImplementation(() => {
       const instanceId = manager.getInstanceId();
       mockEventBus.on.mock.calls.forEach((call: any[]) => {
         if (call[0] === 'saveDocument') {
            call[1]({ 
              instanceId, 
              fileName: 'test.docx', 
              fileType: 'docx',
              binData: new Uint8Array(0)
            });
         }
       });
    });

    manager.setTheme('theme-dark');
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockCreateEditorInstance).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'theme-dark'
    }));
  });
});
