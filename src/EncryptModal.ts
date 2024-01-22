import { GpgResult, getListPublicKey, gpgEncrypt } from "src/gpg";
import { App, Editor, MarkdownView, Modal, Notice, Setting } from "obsidian";
import GpgEncryptPlugin from 'main';

// Enum to identify encrypt modal mode
export enum EncryptModalMode {
    INLINE = "Inline",
    DOCUMENT = "Document"
}

// Encrypt modal (Works for inline and document encryption)
export class EncryptModal extends Modal {

    // List of public keys to encript text
    private listPublicKeyToEncrypt: string[];
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
        this.listPublicKeyToEncrypt = [];
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
        // Sign key name by ID
        let gpgSignName: string = "";
        // Iterate over each public key
		gpgPublicKeys.forEach((gpgPublicKey) => {
			// Add public key as new element in list
            new Setting(contentEl).setName("(" + gpgPublicKey.keyID + ") " + gpgPublicKey.userID).addToggle((toggle) => {
                // Toggle component default value is false
                toggle.setValue(false);
                // Toggle component is created with onChange event
                toggle.onChange((value: boolean) => {
                    // If Toggle is selected
                    if (value) {
                        // Add KeyID to listPublicKeyToEncrypt list
                        this.listPublicKeyToEncrypt.push(gpgPublicKey.keyID);
                    }
                    // If Toggle is unselected
                    else {
                        // Remove KeyID to listPublicKeyToEncrypt list
                        this.listPublicKeyToEncrypt.remove(gpgPublicKey.keyID);
                    }
                });
            });
            // Check if KeyId is same to Sign KeyId
            if (gpgPublicKey.keyID == this.plugin.settings.pgpSignPublicKeyId) {
                // Sign key name by ID
                gpgSignName = gpgPublicKey.userID;
            }
		});
        // Note if Sign is enable
        let signNote: string = this.plugin.settings.pgpSignPublicKeyId == "0" ? "" : "Note: Remember that this text will be encrypted and SIGNED with the key (" + this.plugin.settings.pgpSignPublicKeyId + ") " + gpgSignName;
        let buttonName: string = this.plugin.settings.pgpSignPublicKeyId == "0" ? "Encrypt" : "Sign & Encrypt";
        // Button to encript text
        new Setting(contentEl).setDesc(signNote).addButton((btn) => btn.setButtonText(buttonName).setCta().onClick(async() => {
            // Change button text by loader
            btn.setIcon("loader")
            // Disable button before encryption
            btn.setDisabled(true);
            // Call to Encrypt Text Method
            await this.EncryptText();
            // Enable button after encryption
            btn.setDisabled(false);
            // Change loader icon by text
            btn.setButtonText(buttonName)
        }));

	}

    // OnClose Method
	onClose() {
        // Get an instance of this Element
		const {contentEl} = this;
        // Clear element
		contentEl.empty();
	}

    // Method to encript text with previous configuration
    private async EncryptText() {
        // Check if EncryptMode is Inline
        if (this.encryptMode == EncryptModalMode.INLINE) {
            // Send Encrypt command with list of GPG public keys IDs
            let encryptedTextResult: GpgResult = await gpgEncrypt(this.plugin.settings.pgpExecPath, this.editor.getSelection(), this.listPublicKeyToEncrypt, this.plugin.settings.pgpSignPublicKeyId);
            // Check if any error exists
            if (encryptedTextResult.error) {
                // Show the error message
                new Notice(encryptedTextResult.error.message);
            }
            // In case of no error happend
            else {
                // Replace encrypted text in selection
                this.editor.replaceSelection(this.BufferToSecretBase64(encryptedTextResult.result!));
                // Close this modal
                this.close();
            }
        }
        // Check if EncryptMode is Document
        else if (this.encryptMode == EncryptModalMode.DOCUMENT) {
            // Send Encrypt command with list of GPG public keys IDs
            let encryptedTextResult: GpgResult = await gpgEncrypt(this.plugin.settings.pgpExecPath, this.editor.getValue(), this.listPublicKeyToEncrypt, this.plugin.settings.pgpSignPublicKeyId);
            // Check if any error exists
            if (encryptedTextResult.error) {
                // Show the error message
                new Notice(encryptedTextResult.error.message);
            }
            // In case of no error happend
            else {
                // Replace encrypted text in selection
                this.editor.setValue(this.BufferToSecretBase64(encryptedTextResult.result!));
                // Close this modal
                this.close();
            }
        }
    }

    // Convert Buffer to text in Base64 with some scape characters to be identify in LivePreview
    private BufferToSecretBase64(bufferEncrypted: Buffer): string {
        // Return buffer converted in Base64 with some scape characters to be identify in LivePreview
        return "`gpg-base-64 " + bufferEncrypted.toString('base64') + "`";
    }
}
