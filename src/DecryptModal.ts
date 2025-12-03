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
        // Get the full document text
        const fullText = editor.getValue();
        // Extract the encrypted text based on from and to positions
        const encryptedText = fullText.substring(from, to);
        // Search for this exact encrypted text in the document using a more robust approach
        const lines = editor.getValue().split('\n');
        let charCount = 0;
        // Iterate through lines to find the correct position
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const lineStart = charCount;
            const lineEnd = charCount + line.length;
            // Check if the encrypted text is within this line
            if (lineStart <= from && lineEnd >= to) {
                // Calculate positions within the line
                const chFrom = from - lineStart;
                const chTo = to - lineStart;
                // Create editor positions
                const editorPositionFrom: EditorPosition = { ch: chFrom, line: lineNum };
                const editorPositionTo: EditorPosition = { ch: chTo, line: lineNum };
                // Replace the encrypted text with plain text
                editor.replaceRange(this.plainText, editorPositionFrom, editorPositionTo);
                // Success notification
                new Notice("Plain text restored successfully!");
                return;
            }
            // Add line length + 1 for the newline character
            charCount += line.length + 1;
        }
        // If we couldn't find it by position, try to find the pattern
        const pattern = new RegExp('`' + encryptedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`', 'g');
        const fullTextWithPattern = editor.getValue();
        // Check if pattern exists
        if (pattern.test(fullTextWithPattern)) {
            // Replace using string replacement
            const newText = fullTextWithPattern.replace(pattern, this.plainText);
            editor.setValue(newText);
            new Notice("Plain text restored successfully!");
            return;
        }
        // Error message
        new Notice("The encrypted text was not found in the current document");
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