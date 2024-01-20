import { Command } from "obsidian";

// HotKeys class
export class HotKeys {
    // HotKey to Encrypt Inline
    public static GpgEncryptInline: Command = {
        id: 'gpg-encrypt-inline',
        name: 'GPG encrypt inline',
        callback: () => {
            // todo: link modal to encrypt inline
        }
    };
    // HotKey to Encrypt Document
    public static GpgEncryptDocument: Command = {
        id: 'gpg-encrypt-document',
        name: 'GPG encrypt document',
        callback: () => {
            // todo: link modal to encrypt document
        }
    };
}
