import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { GPG_INLINE_ENCRYPT_PREFIX } from "./EncryptModal";
import { App, editorLivePreviewField } from "obsidian";
import type { PluginValue, } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from "@codemirror/language";
import { DecryptPreviewModal } from './DecryptPreviewModal';
import GpgEncryptPlugin from 'main';

// widget that will replace the encrypted text
export class EncryptedWidget extends WidgetType {

    // Constructor function with initial args
    constructor(public app: App, public value: string, public plugin: GpgEncryptPlugin, public from: number, public to: number) {
        super();
    }

    // Method that will manipulate DOM to include decrypt button
    toDOM(): HTMLElement {
        // New div that will contain the decrypt button
        const div = document.createElement("span");
        // Add new CSS class to div
        div.addClass('gpg-decrypt-div');
        // New div that is the decrypt button
        let a = div.createEl('a');
        // Add new CSS class to a
        a.addClass('gpg-decrypt-a');
        // OnClickEvent in element a
        a.onClickEvent(() => {
            // Open Decrypt Modal with all arguments
            new DecryptPreviewModal(this.app, this.value, this.plugin, this.from, this.to).open();
        });
        // Return div that contains decrypt button
        return div;
    }
}

// Live Preview Extension to change encrypted text into a image button
export const livePreviewExtensionGpgEncrypt = (app: App, plugin: GpgEncryptPlugin) => ViewPlugin.fromClass(class implements PluginValue {
    // Decoration set
    decorations: DecorationSet;

    // Constructor to inicialize EditorView
    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    // Update function
    update(update: ViewUpdate) {
        if (!update.state.field(editorLivePreviewField)) {
            this.decorations = Decoration.none;
            return;
        }
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    // Function to build decorations
    private buildDecorations(view: EditorView): DecorationSet {
        // In case of editor is not in Live Preview
        if (!view.state.field(editorLivePreviewField)) {
            // Return that decoration is none
            return Decoration.none;
        }
        // Creatin instance of builder
        const builder = new RangeSetBuilder<Decoration>();
        // Iterate over each visible ranges
        for (const { from, to } of view.visibleRanges) {
            // Get the text content to search for inline code patterns
            const text = view.state.doc.sliceString(from, to);
            const codePattern = /`(gpg-base-64[^`]+)`/g;
            let match;
            
            // Search for all inline code patterns with encrypted text
            while ((match = codePattern.exec(text)) !== null) {
                const matchStart = from + match.index;
                const matchEnd = matchStart + match[0].length;
                const encryptedValue = match[1]; // Content without backticks
                
                // Replace the decoration for EncryptedWidget
                builder.add(matchStart, matchEnd,
                    Decoration.replace({
                        widget: new EncryptedWidget(app, encryptedValue, plugin, matchStart, matchEnd)
                    })
                );
            }
        }
        return builder.finish();
    }

    // Destry method
    destroy() {

    }
},
{ decorations: instance => instance.decorations });
