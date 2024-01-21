import { GpgSettingsTab } from 'src/SettingsTab';
import { HotKeys } from 'src/HotKeys';
import { Plugin } from 'obsidian';
import { GpgEncryptSettings, Settings } from 'src/Settings';

// My plugin PGP Encrypt
export default class GpgEncryptPlugin extends Plugin {

	// Settings property in PGP Encrypt Plugin
	settings: GpgEncryptSettings;

	// OnLoad Method in PGP Encrypt Plugin
	async onload() {
		// Load settings variables
		await new Settings(this).loadSettings();
		// Add setting tab
		this.addSettingTab(new GpgSettingsTab(this.app, this));
		// Add hotkeys
		let hotKeys: HotKeys = new HotKeys(this.app, this);
		this.addCommand(hotKeys.GpgEncryptInline);
		this.addCommand(hotKeys.GpgEncryptDocument);
	}

	// OnUnload Method in PGP Encrypt Plugin
	onunload() {

	}
}
