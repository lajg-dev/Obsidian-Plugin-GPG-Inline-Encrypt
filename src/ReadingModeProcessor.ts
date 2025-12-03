import { App, MarkdownPostProcessorContext } from "obsidian";
import { GPG_INLINE_ENCRYPT_PREFIX } from "./EncryptModal";
import { DecryptPreviewModal } from "./DecryptPreviewModal";
import GpgEncryptPlugin from "main";

// Reading Mode Post Processor for GPG Encrypted Text
export const registerReadingModeProcessor = (app: App, plugin: GpgEncryptPlugin) => {
    return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        // Find all code elements in the reading view
        const codeElements = el.querySelectorAll('code');
        
        codeElements.forEach((codeEl) => {
            // Get the text content of the code element
            const text = codeEl.textContent || '';
            
            // Check if this code element contains encrypted text
            if (text.startsWith(GPG_INLINE_ENCRYPT_PREFIX)) {
                // Create a wrapper span to hold the decrypt button
                const wrapper = document.createElement('span');
                wrapper.addClass('gpg-decrypt-div');
                
                // Create the decrypt button
                const decryptButton = document.createElement('a');
                decryptButton.addClass('gpg-decrypt-a');
                
                // Add click event to open decrypt modal
                decryptButton.addEventListener('click', async () => {
                    // Get the source text and calculate positions
                    let matchStart = 0;
                    let matchEnd = 0;
                    
                    // Try to get file content and find positions
                    const file = app.workspace.getActiveFile();
                    if (file) {
                        const content = await app.vault.read(file);
                        const pattern = new RegExp(`\`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``);
                        const match = pattern.exec(content);
                        
                        if (match && match.index !== undefined) {
                            matchStart = match.index;
                            matchEnd = matchStart + match[0].length;
                        }
                    }
                    // Open Decrypt Modal with calculated positions
                    new DecryptPreviewModal(app, text, plugin, matchStart, matchEnd).open();
                });
                
                // Add the button to wrapper
                wrapper.appendChild(decryptButton);
                
                // Replace the code element with our wrapper
                codeEl.replaceWith(wrapper);
            }
        });
    };
};
