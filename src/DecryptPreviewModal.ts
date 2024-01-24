import { App, Modal, Notice, Setting } from "obsidian";
import { GPG_INLINE_ENCRYPT_PREFIX } from "./EncryptModal";
import { DecryptModal } from "./DecryptModal";
import { GpgResult, gpgDecrypt } from "./gpg";
import GpgEncryptPlugin from "main";

// Decrypt Preview modal (Works for inline and document encryption)
export class DecryptPreviewModal extends Modal {

    // Original GPG Encrypted Message in Base64
    encryptedMessageBase64: string;
    // Original GPG Encrypted Message
    encryptedMessage: string;

    // Constructor of modal encrypt
	constructor(app: App, encryptedMessageBase64: string, public plugin: GpgEncryptPlugin, public from: number, public to: number) {
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
        // A title div and text p is created
        contentEl.createEl("h1", { text: "Decrypt Preview" });
        contentEl.createEl("p").setText("Preview encrypted text:");
        // Div to contain code preview
        const divCode: HTMLDivElement = contentEl.createEl("div");
        divCode.className = "gpg-code-preview";
        // Split encrypted message by returns
        let encryptedMessageSplited = this.encryptedMessage.split("\n");
        // Max number of rows in preview screen
        const max_number_rows: number = 20;
        // Flag to detect if middle dots were printed
        let isMiddleDotsPrinted: boolean = false;
        // Iterate in each encrypted message splitted value
        for (let i = 0; i < encryptedMessageSplited.length; i++) {
            // Encrypted Line
            let encryptedMessageLine = encryptedMessageSplited[i];
            // In case of encrypted message lines is more than max_number_rows
            if (encryptedMessageSplited.length > max_number_rows) {
                // Print first max_number_rows/2 lines
                if (i >= max_number_rows / 2 && i < encryptedMessageSplited.length - (max_number_rows / 2) - 1) {
                    // Check if middle poins were printed
                    if (isMiddleDotsPrinted) {
                        // if yes, continue
                        continue;
                    }
                    // In case of middle poins weren't printed
                    else {
                        // Mark as printed
                        isMiddleDotsPrinted = true;
                        // Print middle dots
                        encryptedMessageLine = ". . .";
                    }
                }
            }
            // Element type code to present a preview of encrypted text
            divCode.createEl("code").setText(this.standarizeLinePreview(encryptedMessageLine));
            // Element type br to present a return in preview screen
            divCode.createEl("br");
        }
        // Button to decript text
        let buttonName: string = "Decrypt";
        new Setting(contentEl)
        .addButton((btn) => btn.setButtonText("Copy Encrypted Text").onClick(async() => {
            // Copy encrypted message to clipboard
            navigator.clipboard.writeText(this.encryptedMessage);
            // Send successful copy to clipboard
            new Notice("Encrypted Text Was Copied!")
        })).addButton((btn) => btn.setButtonText(buttonName).setCta().onClick(async() => {
            // Change button text by loader
            btn.setIcon("loader")
            // Disable button before encryption
            btn.setDisabled(true);
            // Send Decrypt command
            let decryptedTextResult: GpgResult = await gpgDecrypt(this.plugin.settings, this.encryptedMessage);
            // Check if result contains data
            if (decryptedTextResult.result) {
                // Extra info in decrypt process
                let extraInfo: string = "";
                // In case of any error happend
                if (decryptedTextResult.error) {
                    // Show extra info in variable
                    extraInfo = decryptedTextResult.error.message;
                }
                // Open a new decrypt modal with plain text
                new DecryptModal(this.app, decryptedTextResult.result.toString().trim(), extraInfo, this.plugin, this.from, this.to).open();
                // Close this modal
                this.close();
            }
            // In case of any error happend
            else if (decryptedTextResult.error) {
                // Show the error message
                new Notice(decryptedTextResult.error.message);
            }
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

    // Function to stadarize a line in preview screen
    standarizeLinePreview(line: string): string {
        // Trim Line to avoid spaces
        line = line.trim();
        // Check if Line is not null nor empty
        if (line && line.length > 0) {
            // Code element with part of the gpg encrypted text
            return line.substring(0, (line.length > 40 ? 40 : line.length)) + (line.length > 40 ? "..." : "");
        }
        // Return empty in case of empty line
        return "";
    }

}
