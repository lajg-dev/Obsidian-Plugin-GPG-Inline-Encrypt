import { GpgResult, getListPublicKey, gpgEncrypt } from "src/gpg";
import { App, Editor, MarkdownView, Modal, Notice, Setting } from "obsidian";
import GpgEncryptPlugin from 'main';
import { utf8ToBase64, getPassphrase, setCachedPassphrase } from "./openpgp";
import { PassphraseModal } from "./PassphraseModal";

// Enum to identify encrypt modal mode
export enum EncryptModalMode {
    INLINE = "Inline",
    DOCUMENT = "Document"
}

// GPG Encrypt Inline Prefix
export const GPG_INLINE_ENCRYPT_PREFIX: string = "gpg-base-64";

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
        // For openpgpjs, use the single configured key with a simplified UI
        if (this.plugin.settings.pgpLibrary === "openpgpjs") {
            // Require a configured public key
            if (!this.plugin.settings.pgpPublicKeyArmored || this.plugin.settings.pgpPublicKeyArmored.trim() === "") {
                contentEl.createEl("p", { text: "❌ No public key configured. Go to plugin settings and paste your GPG public key." });
                return;
            }
            // Show which key will be used
            let openpgpKeys = await getListPublicKey(this.plugin, this.plugin.settings);
            if (openpgpKeys.length > 0) {
                contentEl.createEl("p", { text: "Encrypting with key: " + openpgpKeys[0].userID + " (" + openpgpKeys[0].keyID + ")" });
            }
            // The configured key is always used as recipient
            this.listPublicKeyToEncrypt = ["configured-key"];
            // Note and button text depending on sign setting
            let openpgpSignNote = this.plugin.settings.pgpSignPublicKeyId !== "0" ? "Text will also be signed with your private key." : "";
            let openpgpButtonName = this.plugin.settings.pgpSignPublicKeyId !== "0" ? "Sign & Encrypt" : "Encrypt";
            new Setting(contentEl).setDesc(openpgpSignNote).addButton((btn) => btn.setButtonText(openpgpButtonName).setCta().onClick(async() => {
                btn.setIcon("loader");
                btn.setDisabled(true);
                await this.EncryptText();
                btn.setDisabled(false);
                btn.setButtonText(openpgpButtonName);
            }));
            return;
        }
        // Help text is created to select GPG keys
        contentEl.createEl("p", { text: "Select which Public GPG key(s) you want to be able to decrypt the text:" });
        // Get list of GPG public Keys
		let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin, this.plugin.settings);
        // Sign key name by ID
        let gpgSignName: string = "";
        // Iterate over each public key
		gpgPublicKeys.forEach((gpgPublicKey) => {
			// Add public key as new element in list
            new Setting(contentEl).setName("(" + gpgPublicKey.keyID + ") " + gpgPublicKey.userID).addToggle((toggle) => {
                //Set a default value variable
                let defaultValue: boolean = this.plugin.settings.pgpDefaultEncryptKeys.indexOf(gpgPublicKey.keyID) > -1;
                // Toggle component default value is getting from pgpDefaultEncryptKeys
                toggle.setValue(defaultValue);
                // Run toogle OnChange event
                this.toogleOnChange(defaultValue, gpgPublicKey.keyID);
                // Toggle component is created with onChange event
                toggle.onChange((value: boolean) => {
                    // Toogle OnChange event
                    this.toogleOnChange(value, gpgPublicKey.keyID);
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

    // Method that run when toogle OnChange event is called
    private toogleOnChange(value: boolean, keyID: string) {
        // If Toggle is selected
        if (value) {
            // Add KeyID to listPublicKeyToEncrypt list
            this.listPublicKeyToEncrypt.push(keyID);
        }
        // If Toggle is unselected
        else {
            // Remove KeyID to listPublicKeyToEncrypt list
            this.listPublicKeyToEncrypt.remove(keyID);
        }
    }

    // Method to encript text with previous configuration
    private async EncryptText() {
        // For openpgpjs with signing enabled, resolve the passphrase before encrypting
        let passphrase: string | null = null;
        if (this.plugin.settings.pgpLibrary === "openpgpjs" && this.plugin.settings.pgpSignPublicKeyId !== "0") {
            passphrase = getPassphrase(this.plugin.settings);
            if (!passphrase) {
                passphrase = await PassphraseModal.prompt(this.app);
                // User cancelled the passphrase prompt
                if (!passphrase) return;
            }
        }
        // Check if EncryptMode is Inline
        if (this.encryptMode == EncryptModalMode.INLINE) {
            // Send Encrypt command with list of GPG public keys IDs
            let encryptedTextResult: GpgResult = await gpgEncrypt(this.plugin, this.plugin.settings, this.editor.getSelection(), this.listPublicKeyToEncrypt, this.plugin.settings.pgpSignPublicKeyId, passphrase);
            // Check if any error exists
            if (encryptedTextResult.error) {
                // Show the error message
                new Notice(encryptedTextResult.error.message);
            }
            // In case of no error happend
            else {
                // Cache the passphrase after a successful sign+encrypt
                if (passphrase) {
                    setCachedPassphrase(passphrase, (this.plugin.settings.pgpPassphraseCacheMinutes || 5) * 60 * 1000);
                }
                // Replace encrypted text in selection
                this.editor.replaceSelection(this.ToSecretBase64(encryptedTextResult.result!));
                // Close this modal
                this.close();
            }
        }
        // Check if EncryptMode is Document
        else if (this.encryptMode == EncryptModalMode.DOCUMENT) {
            // Send Encrypt command with list of GPG public keys IDs
            let encryptedTextResult: GpgResult = await gpgEncrypt(this.plugin, this.plugin.settings, this.editor.getValue(), this.listPublicKeyToEncrypt, this.plugin.settings.pgpSignPublicKeyId, passphrase);
            // Check if result contains data
            if (encryptedTextResult.result) {
                // Cache the passphrase after a successful sign+encrypt
                if (passphrase) {
                    setCachedPassphrase(passphrase, (this.plugin.settings.pgpPassphraseCacheMinutes || 5) * 60 * 1000);
                }
                // Replace encrypted text in selection
                this.editor.setValue(this.ToSecretBase64(encryptedTextResult.result));
                // Close this modal
                this.close();
            }
            // In case of any error happend
            else if (encryptedTextResult.error) {
                // Show the error message
                new Notice(encryptedTextResult.error.message);
            }
        }
    }

    // Convert the encrypted result to Base64 with some scape characters to be identify in LivePreview
    private ToSecretBase64(encrypted: Buffer | string): string {
        // Native GPG returns a Buffer; openpgpjs returns an armored string (encode browser-safe)
        const base64: string = typeof encrypted === "string" ? utf8ToBase64(encrypted) : encrypted.toString('base64');
        // Return encoded text with some scape characters to be identify in LivePreview
        return "`" + GPG_INLINE_ENCRYPT_PREFIX + " " + base64 + "`";
    }
}
