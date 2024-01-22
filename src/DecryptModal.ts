import { App, Modal } from "obsidian";

// Decrypt modal (Works for inline and document encryption)
export class DecryptModal extends Modal {

    // Original GPG Encrypted Message in Base64
    encryptedMessageBase64: string;

    // Constructor of modal encrypt
	constructor(app: App, encryptedMessageBase64: string) {
		super(app);
        this.encryptedMessageBase64 = encryptedMessageBase64;
	}

     // OnOpen Method
	async onOpen() {
        // Get an instance of this Element
        const {contentEl} = this;
        // A title div is created
        contentEl.createEl("h1", { text: "Decrypt" });
    }

    // OnClose Method
	onClose() {
        // Get an instance of this Element
		const {contentEl} = this;
        // Clear element
		contentEl.empty();
	}

}