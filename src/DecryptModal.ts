import { App, Modal, Notice, Setting } from "obsidian";
import { GPG_INLINE_ENCRYPT_PREFIX } from "./EncryptModal";

// Decrypt modal (Works for inline and document encryption)
export class DecryptModal extends Modal {

    // Original GPG Encrypted Message in Base64
    encryptedMessageBase64: string;
    // Original GPG Encrypted Message
    encryptedMessage: string;

    // Constructor of modal encrypt
	constructor(app: App, encryptedMessageBase64: string) {
		super(app);
        // Remove scape characters
        let encryptedMessageBase64WithoutScapeKeys = encryptedMessageBase64.substring(GPG_INLINE_ENCRYPT_PREFIX.length + 1, encryptedMessageBase64.length);
        // Assing encryptedMessageBase64WithoutScapeKeys to encryptedMessageBase64
        this.encryptedMessageBase64 = encryptedMessageBase64WithoutScapeKeys;
        // Create a buffer from the string
        let bufferObj = Buffer.from(encryptedMessageBase64WithoutScapeKeys, "base64");
        // Encode the Buffer as a utf8 string
        this.encryptedMessage = bufferObj.toString("utf8");
	}

     // OnOpen Method
	async onOpen() {
        // Get an instance of this Element
        const {contentEl} = this;
        // A title div is created
        contentEl.createEl("h1", { text: "Decrypt" });

        // Create code text with part of the encrypted message
        let codeText = "--- begin ---- etc...";
        // TODO: Create a short version of encrypted text

        // Code element with part of the gpg encrypted text
        contentEl.createEl("code").setText(codeText);
        
        // Button to encript text
        new Setting(contentEl)
        .addButton((btn) => btn.setButtonText("Copy Encrypted Text").onClick(async() => {

            // TODO: Copy to clipboard

            // Send successful copy to clipboard
            new Notice("Encrypted Text Was Copied!")
        })).addButton((btn) => btn.setButtonText("Decrypt").setCta().onClick(async() => {

            // TODO: Decrypt message

        }));
    }

    // OnClose Method
	onClose() {
        // Get an instance of this Element
		const {contentEl} = this;
        // Clear element
		contentEl.empty();
	}

}