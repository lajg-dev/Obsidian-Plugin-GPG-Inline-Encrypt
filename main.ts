import { App, Modal, Notice, Plugin } from 'obsidian';
import { GpgSettingsTab } from 'src/SettingsTab';
import { HotKeys } from 'src/HotKeys';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	pgpExecPath: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	pgpExecPath: '/usr/local/bin/gpg'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		// Load settings variables
		await this.loadSettings();

		// Add setting tab
		this.addSettingTab(new GpgSettingsTab(this.app, this));

		// Add hotkeys
		this.addCommand(HotKeys.GpgEncryptInline);
		this.addCommand(HotKeys.GpgEncryptDocument);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
