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
    constructor(public app: App, public value: string, public plugin: GpgEncryptPlugin) {
        super();
    }

    // Method that will manipulate DOM to include decrypt button
    toDOM(view: EditorView): HTMLElement {
        // New div that will contain the decrypt button
        const div = document.createElement("span");
        // Add new CSS class to div
        div.addClass('gpg-decrypt-div');
        // New div that is the decrypt button
        let a = div.createEl('a');
        // Add new CSS class to a
        a.addClass('gpg-decrypt-a');
        // OnClickEvent in element a
        a.onClickEvent((event: MouseEvent) => {
            // Open Decrypt Modal with all arguments
            new DecryptPreviewModal(this.app, this.value, this.plugin).open();
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
            // Iterate over each state
            syntaxTree(view.state).iterate({ from, to, enter(node: any) {
                // Check if type of line is a inline-code
                if (node.type.name.startsWith("inline-code")) {
                    // Get value of this inline-code
                    const value = view.state.doc.sliceString(node.from, node.to)
                    // Check if this line start with GPG Inline Encrypt Prefix and mark isEncrypted as true
                    const isEncrypted = value.indexOf(GPG_INLINE_ENCRYPT_PREFIX) === 0;
                    // Check if isEncrypted is true
                    if (isEncrypted) {
                        // Replace the decoration for EncryptedWidget
                        builder.add(node.from, node.to,
                            Decoration.replace({
                                widget: new EncryptedWidget(app, value, plugin)
                            })
                        );
                    }
                }
            }});
        }
        return builder.finish();
    }

    // Destry method
    destroy() {

    }
},
{ decorations: instance => instance.decorations });
