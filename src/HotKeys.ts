import { EncryptModal, EncryptModalMode } from "./EncryptModal";
import { App, Command, Editor, MarkdownView } from "obsidian";
import GpgEncryptPlugin from 'main';

// HotKeys class
export class HotKeys {
    // Current app instance
    private app: App;
    // Current plugin instance
	plugin: GpgEncryptPlugin;
    // Constructor with App and GpgEncryptPlugin
	constructor(app: App, plugin: GpgEncryptPlugin) {
		this.app = app;
        this.plugin = plugin;
	}
    // HotKey to Encrypt Inline
    public GpgEncryptInline: Command = {
        id: 'inline',
        name: 'Encrypt inline',
        icon: 'lock',
        editorCallback: (editor: Editor, view: MarkdownView) => {
            // Open Encrypt Modal in mode InLine
            new EncryptModal(this.app, this.plugin, EncryptModalMode.INLINE, editor, view).open();
        }
    };
    // HotKey to Encrypt Document
    public GpgEncryptDocument: Command = {
        id: 'document',
        name: 'Encrypt document',
        icon: 'lock',
        editorCallback: (editor: Editor, view: MarkdownView) => {
            // Open Encrypt Modal in mode Document
            new EncryptModal(this.app, this.plugin, EncryptModalMode.DOCUMENT, editor, view).open();
        }
    };
}
