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
                decryptButton.addEventListener('click', () => {
                    // Open Decrypt Modal
                    // Note: In reading mode, we don't have the exact from/to positions
                    // so we pass 0, 0 as placeholders since they're not used for display
                    new DecryptPreviewModal(app, text, plugin, 0, 0).open();
                });
                
                // Add the button to wrapper
                wrapper.appendChild(decryptButton);
                
                // Replace the code element with our wrapper
                codeEl.replaceWith(wrapper);
            }
        });
    };
};
