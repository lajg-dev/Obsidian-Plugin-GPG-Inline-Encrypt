import { getListPublicKey } from "gpg";
import { App, Editor, MarkdownView, Modal, Notice } from "obsidian";
import GpgEncryptPlugin from 'main';

// Enum to identify encrypt modal mode
export enum EncryptModalMode {
    INLINE = "Inline",
    DOCUMENT = "Document"
}

// Encrypt modal (Works for inline and document encryption)
export class EncryptModal extends Modal {
    // Encrypt modal mode
    private encryptMode: EncryptModalMode;
    // Editor
    private editor: Editor;
    // Markdown View
    private view: MarkdownView;
    // Current plugin instance
	plugin: GpgEncryptPlugin;
    // Constructor of modal encrypt
	constructor(app: App, plugin: GpgEncryptPlugin, mode: EncryptModalMode, editor: Editor, view: MarkdownView) {
		super(app);
        this.plugin = plugin;
        this.encryptMode = mode;
        this.editor = editor;
        this.view = view;
	}
    // OnOpen Method
	async onOpen() {
        // Get an instance of this Element
		const {contentEl} = this;
        // A title div is created
        contentEl.createEl("h1", { text: "Encrypt " + this.encryptMode });
        // Check if encryption mode is InLine and Check if some text is not selected
        if (this.encryptMode == EncryptModalMode.INLINE && !this.editor.somethingSelected()) {
            // Show a user message that is mandatory select a text before
            new Notice('❌ Select some text to encrypt');
            // Close this modal
            this.close();
        }
        // Check if encryption mode is Document and Check if editor is null
        if (this.encryptMode == EncryptModalMode.DOCUMENT && !this.editor) {
            // Show a user message that is mandatory have a document
            new Notice('❌ Open a file to encrypt');
            // Close this modal
            this.close();
        }
        // Help text is created to select GPG keys
        contentEl.createEl("p", { text: "Select which Public GPG key(s) you want to be able to decrypt the text:" });
        // Get list of GPG public Keys
		let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin.settings.pgpExecPath);
        // Iterate over each public key
		gpgPublicKeys.forEach((gpgPublicKey) => {
			// Add public key as new element in list

		});

	}
    // OnClose Method
	onClose() {
        // Get an instance of this Element
		const {contentEl} = this;
        // Clear element
		contentEl.empty();
	}
}
