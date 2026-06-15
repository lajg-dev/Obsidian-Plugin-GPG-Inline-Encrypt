import GpgEncryptPlugin from "main";

// Settings object
export interface GpgEncryptSettings {
	pgpExecPaths: string[];
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
    pgpExecPaths: getDefaultExecPaths(),
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
        const loadedData = await this.plugin.loadData();
        this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        
        // Migration: convert old single pgpExecPath to pgpExecPaths array
        if (loadedData && 'pgpExecPath' in loadedData && typeof loadedData.pgpExecPath === 'string') {
            if (loadedData.pgpExecPath) {
                // If old path exists, put it first in array, then add defaults
                this.plugin.settings.pgpExecPaths = [loadedData.pgpExecPath, ...getDefaultExecPaths().filter(p => p !== loadedData.pgpExecPath)];
            } else {
                // If old path was empty, just use defaults
                this.plugin.settings.pgpExecPaths = getDefaultExecPaths();
            }
            // Save migrated settings
            await this.saveSettings();
        }
    }

    // Save Settings to Plugin Data
    async saveSettings() {
        await this.plugin.saveData(this.plugin.settings);
    }

    // Get the first working GPG executable path from the list
    async getWorkingGpgPath(): Promise<string | null> {
        // Lazy require so it works on mobile
        if (typeof process === "undefined" || !process.platform) {
            return null;
        }
        
        const fs = require('fs');
        
        // Try each path in order
        for (const path of this.plugin.settings.pgpExecPaths) {
            if (!path) continue;
            
            try {
                // Check if file exists and is a gpg executable
                if (fs.existsSync(path) && 
                    (path.endsWith("gpg") || path.endsWith("gpg.exe") || 
                     path.endsWith("gpg2") || path.endsWith("gpg2.exe"))) {
                    return path;
                }
            } catch (ex) {
                // Continue to next path
                continue;
            }
        }
        
        return null;
    }
}

// Get Default Exec Paths for all platforms
function getDefaultExecPaths(): string[] {
    // On mobile there is no Node process; return empty (native GPG is unavailable there)
    if (typeof process === "undefined" || !process.platform) {
        return [];
    }
    // Return common paths for all platforms so config works cross-platform
    return [
        // Windows paths
        "C:\\Program Files (x86)\\GnuPG\\bin\\gpg.exe",
        "C:\\Program Files\\GnuPG\\bin\\gpg.exe",
        // macOS paths
        "/usr/local/bin/gpg",
        "/opt/homebrew/bin/gpg",
        "/usr/local/MacGPG2/bin/gpg",
        "/usr/local/MacGPG2/bin/gpg2",
        // Linux paths
        "/usr/bin/gpg",
        "/usr/bin/gpg2",
        "/bin/gpg",
        "/bin/gpg2"
    ];
}
