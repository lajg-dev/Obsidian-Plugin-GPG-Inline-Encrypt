import { GpgSettingsTab } from 'src/SettingsTab';
import { HotKeys } from 'src/HotKeys';
import { Plugin } from 'obsidian';

interface GpgEncryptSettings {
	pgpExecPath: string;
	pgpSignPublicKeyId: string
}

const DEFAULT_SETTINGS: GpgEncryptSettings = {
	pgpExecPath: '/usr/local/bin/gpg',
	pgpSignPublicKeyId: "0"
}

export default class GpgEncryptPlugin extends Plugin {
	settings: GpgEncryptSettings;

	async onload() {
		// Load settings variables
		await this.loadSettings();

		// Add setting tab
		this.addSettingTab(new GpgSettingsTab(this.app, this));

		// Add hotkeys
		let hotKeys: HotKeys = new HotKeys(this.app, this);
		this.addCommand(hotKeys.GpgEncryptInline);
		this.addCommand(hotKeys.GpgEncryptDocument);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
