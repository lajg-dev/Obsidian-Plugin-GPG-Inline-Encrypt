import GpgEncryptPlugin from "main";

// Settings object
export interface GpgEncryptSettings {
	pgpExecPath: string;
	pgpSignPublicKeyId: string
    pgpAlwaysTrust: boolean
}

// Default settings values
const DEFAULT_SETTINGS: GpgEncryptSettings = {
    pgpExecPath: getDefaultExecPath(),
    pgpSignPublicKeyId: "0",
    pgpAlwaysTrust: false
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

// Get Default Exec Path in base on platform name
function getDefaultExecPath(): string {
    // Check platform name
    switch (process.platform) {
        // In case of Windows OS
        case "win32":
            return "C:\\Program Files (x86)\\GnuPG\\bin\\gpg.exe";
        // In case of MacOS
        case "darwin":
            return "/usr/local/bin/gpg";
        // In case of Linux
        case "linux":
            return "/usr/bin/gpg";
        // In default value return empty
        default:
            return "";
    }
}
