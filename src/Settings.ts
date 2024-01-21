import GpgEncryptPlugin from "main";

// Settings object
export interface GpgEncryptSettings {
	pgpExecPath: string;
	pgpSignPublicKeyId: string
}

// Default settings values
const DEFAULT_SETTINGS: GpgEncryptSettings = {
    pgpExecPath: '/usr/local/bin/gpg',
    pgpSignPublicKeyId: "0"
}

// Settings class
export class Settings {

    // Current plugin instance
	plugin: GpgEncryptPlugin;

    // Constructor of modal encrypt
    constructor(plugin: GpgEncryptPlugin) {
        this.plugin = plugin;
    }

    // Load Settings from Plugin Data
    async loadSettings() {
        this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
    }

    // Save Settings to Plugin Data
    async saveSettings() {
        await this.plugin.saveData(this.plugin.settings);
    }
}