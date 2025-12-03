import { App, Editor, EditorPosition, MarkdownView, Modal, Notice, Setting } from "obsidian";
import GpgEncryptPlugin from "main";

// Decrypt modal (Works for inline and document encryption)
export class DecryptModal extends Modal {

    // Constructor of modal encrypt
	constructor(app: App, public plainText: string, public extraInfo: string, public plugin: GpgEncryptPlugin, public from: number, public to: number) {
		super(app);
	}

    // OnOpen Method
	async onOpen() {
        // Get an instance of this Element
        const {contentEl} = this;
        // A title div is created
        contentEl.createEl("h1", { text: "Decrypted text" });
        // Check if extra info is not null nor empty
        if (this.extraInfo && this.extraInfo.trim() != "") {
            // P that shows extra info in decrypt process
            let extraInfoDiv: HTMLDivElement = contentEl.createEl("div");
            extraInfoDiv.className = "gpg-code-sign-ok";
            this.organizeOutText(this.extraInfo, extraInfoDiv);
        }
        // Text p is created
        contentEl.createEl("p").setText("Plain text preview of the decrypted message:");
        // Textarea that contains plain text decrypted
        let textArea: HTMLTextAreaElement = contentEl.createEl("textarea");
        textArea.readOnly = true;
        textArea.setText(this.plainText);
        textArea.className = "gpg-plain-text-area";
        // Button to copy to clipboard
        let buttons: Setting = new Setting(contentEl)
        .addButton((btn) => btn.setButtonText("Copy Plain Text").onClick(async() => {
            // Copy plain message to clipboard
            navigator.clipboard.writeText(this.plainText);
            // Send successful copy to clipboard
            new Notice("Plain text was copied!");
        }))
        // Check if activeEditor or editor are available
        if (this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor) {
            // Button restore to document
            buttons.addButton((btn) => btn.setButtonText("Restore plain text to document").setCta().onClick(async() => {
                // Check if the view is in reading mode
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView && activeView.getMode() === "preview") {
                    // Error message for reading mode
                    new Notice("Cannot restore plain text in reading mode. Please switch to Live Preview mode to restore the text.");
                    return;
                }
                // Check if activeEditor or editor are available
                if (this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor) {
                    // The function to replace the encrypted with plaintext is executed
                    this.replaceEncryptedTextWithPlainText(this.from, this.to, this.app.workspace.activeEditor.editor);
                }
                // In case of activeEditor or editor are not available
                else {
                    // Error message
                    new Notice("Error restoring plain text: activeEditor or editor are not available")
                }
                // Close this modal
                this.close();
            }));
        }
    }

    // Function to replace the encrypted with plaintext
    replaceEncryptedTextWithPlainText(from: number, to: number, editor: Editor) {
        // Document total character count
        let lineSum: number = 0;
        // The number of lines that the current document has is counted.
        let lineCount: number = editor.lineCount();
        // It is iterated line by line until the current document is finished.
        for (let lineNum = 0; lineNum < lineCount; lineNum++) {
            // The current line is obtained
            const lineTxt = editor.getLine(lineNum);
            // The number of characters in the current line is calculated.
            const lineLenght = lineTxt.length;
            // It is validated that the characters of the previous lines plus the characters of the current line are greater than the characters of FROM and TO
            if (lineSum + lineLenght > from && lineSum + lineLenght > to) {
                // The FROM position is calculated minus the characters already added from the previous lines minus 1 character to count the inline-code quote.
                let editorPositionFrom: EditorPosition = { ch: from - lineSum - 1, line: lineNum };
                // The TO position is calculated minus the characters already added from the previous lines plus 1 character to count the inline-code quote.
                let editorPositionTo: EditorPosition = { ch: to - lineSum + 1, line: lineNum };
                // The decrypted text is replaced according to the previous calculations.
                editor.replaceRange(this.plainText, editorPositionFrom, editorPositionTo)
                // The for is broken to deliver the result and not continue calculating
                return;
            }
            // In case the characters of the previous lines plus the characters of the current line still do not reach the characters of FROM and TO,
            // it means that this line is not and we continue with the next line
            else {
                // The number of characters on the current line plus 1 carriage return character is added to the sum of the total characters.
                lineSum += lineLenght + 1;
            }
        }
        // Error message
        new Notice("The encrypted text was not found in the current document")
    }

    // Organize out text into code elements
    organizeOutText(outText: string, divCode: any) {
        // Flag to check if is first line
        let isFirstLine: boolean = true;
        // Split lines by return
        let lines: string[] = outText.split("\n");
        // Iterate line by line
        lines.forEach((line) => {
            // Check if is not a first line
            if (!isFirstLine) {
                // Element type br to present a return in preview screen
                divCode.createEl("br");
            }
            // Element type code to present a preview of encrypted text
            divCode.createEl("code").setText(line);
            // Mark flag as false
            isFirstLine = false;
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