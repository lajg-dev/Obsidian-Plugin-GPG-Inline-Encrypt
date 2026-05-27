import { App, Modal, Setting } from "obsidian";

// Modal that prompts for the private key passphrase (mobile has no pinentry/gpg-agent)
export class PassphraseModal extends Modal {

    private passphrase = "";
    private submitted = false;
    private resolve!: (value: string | null) => void;

    constructor(app: App) {
        super(app);
    }

    // Open the modal and resolve with the entered passphrase, or null if cancelled
    static prompt(app: App): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new PassphraseModal(app);
            modal.resolve = resolve;
            modal.open();
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🔑 Enter Passphrase" });
        contentEl.createEl("p", { text: "Enter your GPG private key passphrase to decrypt." });
        new Setting(contentEl).setName("Passphrase").addText((text) => {
            text.setPlaceholder("Enter passphrase...");
            text.inputEl.type = "password";
            text.inputEl.style.width = "100%";
            text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    this.submit();
                }
            });
            text.onChange((value: string) => {
                this.passphrase = value;
            });
            setTimeout(() => text.inputEl.focus(), 50);
        });
        new Setting(contentEl)
            .addButton((btn) => btn.setButtonText("Unlock").setCta().onClick(() => this.submit()))
            .addButton((btn) => btn.setButtonText("Cancel").onClick(() => {
                this.resolve(null);
                this.close();
            }));
    }

    private submit() {
        this.submitted = true;
        this.resolve(this.passphrase);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (!this.submitted && this.resolve) {
            this.resolve(null);
        }
    }
}
