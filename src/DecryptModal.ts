import { App, Modal, Notice, Setting } from "obsidian";
import GpgEncryptPlugin from "main";

// Decrypt modal (Works for inline and document encryption)
export class DecryptModal extends Modal {

    // Constructor of modal encrypt
	constructor(app: App, public plainText: string, public plugin: GpgEncryptPlugin, public from: number, public to: number) {
		super(app);
	}

    // OnOpen Method
	async onOpen() {
        // Get an instance of this Element
        const {contentEl} = this;
        // A title div and text p is created
        contentEl.createEl("h1", { text: "Decrypted text" });
        contentEl.createEl("p").setText("Plain text preview of the decrypted message:");
        // Textarea that contains plain text decrypted
        let textArea: HTMLTextAreaElement = contentEl.createEl("textarea");
        textArea.readOnly = true;
        textArea.setText(this.plainText);
        textArea.className = "gpg-plain-text-area";
        // Button to copy to clipboard
        new Setting(contentEl)
        .addButton((btn) => btn.setButtonText("Copy Plain Text").onClick(async() => {
            // Copy plain message to clipboard
            navigator.clipboard.writeText(this.plainText);
            // Send successful copy to clipboard
            new Notice("Plain Text Was Copied!")
        }))
        // Button restore to document
        .addButton((btn) => btn.setButtonText("Restore plain text to document").setCta().onClick(async() => {
            // TODO: Replace Encrypted text by Plain Text in coords from-to
            console.log("from:", this.from)
            console.log("to:", this.to)
            // Close this modal
            this.close();
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