import GpgEncryptPlugin from "main";

// Settings object
export interface GpgEncryptSettings {
	pgpExecPath: string;
	pgpSignPublicKeyId: string
    pgpAlwaysTrust: boolean,
    pgpDefaultEncryptKeys: Array<string>,
    pgpLibrary: string,
    pgpAditionalCommands: boolean,
    pgpAditionalCommandsBefore: string,
    pgpAditionalCommandsAfter: string,
    pgpAditionalCommandsConsole: boolean,
    // OpenPGP.js library settings (used when pgpLibrary === "openpgpjs")
    pgpPublicKeyArmored: string,
    pgpPrivateKeyArmored: string,
    pgpPassphrase: string,
    pgpPassphraseCacheMinutes: number
}

// Default settings values
const DEFAULT_SETTINGS: GpgEncryptSettings = {
    pgpExecPath: getDefaultExecPath(),
    pgpSignPublicKeyId: "0",
    pgpAlwaysTrust: false,
    pgpDefaultEncryptKeys: [],
    pgpLibrary: "openpgpjs",
    pgpAditionalCommands: false,
    pgpAditionalCommandsBefore: "",
    pgpAditionalCommandsAfter: "",
    pgpAditionalCommandsConsole: false,
    // OpenPGP.js library settings
    pgpPublicKeyArmored: "",
    pgpPrivateKeyArmored: "",
    pgpPassphrase: "",
    pgpPassphraseCacheMinutes: 5
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
    // On mobile there is no Node process; return empty (native GPG is unavailable there)
    if (typeof process === "undefined" || !process.platform) {
        return "";
    }
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
