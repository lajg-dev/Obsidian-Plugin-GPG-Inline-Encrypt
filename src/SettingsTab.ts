import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from 'main';
import spawnGPG, { GpgResult } from 'gpg';
let fs = require('fs');

// Enum of types of GPG executable path status
enum GpgExecPathStatus {
	// In case of Loading message
	LOADING = "Loading...",
	OK = "Ok",
	NO_GPG_IN_PATH = "GPG is not in this path",
	NO_GPG_IN_OUTPUT = "The output does not indicate this is GPG",
	FILE_NOT_FOUND = "File or directory not found",
	NOT_PERMISSION = "Access to the executable file has been denied",
	UNKNOWN_ERROR = "An unknown error occurred"
}

// GPG Settings Tab Class
export class GpgSettingsTab extends PluginSettingTab {
    // Current plugin instance
	plugin: MyPlugin;
    // Constructor with App and MyPlugin
	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	// List of settings objetcts
	private gpgExecPath: Setting;
	private gpgExecPathStatus: HTMLDivElement;
    // Display function in settings tabs
	display(): void {
		// Container Element
		const {containerEl} = this;
		// Clear continer element
		containerEl.empty();

		// ---------- GPG executable setting ----------
		this.gpgExecPath = new Setting(containerEl)
			.setName('GPG executable')
			.setDesc('Path to GPG executable')
			.addText(text => text
				.setPlaceholder('gpg')
				.setValue(this.plugin.settings.pgpExecPath)
				.onChange(async (value: string) => {
					await this.checkGpgPath(value);
				}));
		// Div to show GPG Path status
		this.gpgExecPathStatus = this.gpgExecPath.descEl.createDiv();
		// Run by first time checkGpgPath function
		this.checkGpgPath(this.plugin.settings.pgpExecPath);
		// ---------- GPG executable setting ----------

		// ---------- Another setting ----------
		// 
		// ---------- Another setting ----------
	}

	// Function to check if GPG Path exits
	private async checkGpgPath(value: string) {
		// Start with Loading status while real one is calculated
		this.changeGpgPathStatus(GpgExecPathStatus.LOADING);
		// Start a try in case of exception
		try
		{
			// Check if file doesn not exist
			if (!fs.existsSync(value)) {
				// Change the status to File Not Found
				this.changeGpgPathStatus(GpgExecPathStatus.FILE_NOT_FOUND);
				// End this check process
				return;
			}
			// Check if path ends with any gpg executable
			if (!value.endsWith("gpg") && !value.endsWith("gpg.exe") && !value.endsWith("gpg2") && !value.endsWith("gpg2.exe")){
				// Change the status to No GPG In Path
				this.changeGpgPathStatus(GpgExecPathStatus.NO_GPG_IN_PATH);
				// End this check process
				return;
			}
			// Check GPG version in console
			let gpgResult: GpgResult = await spawnGPG(value, null, ["--logger-fd", "1", "--version"]);
			// Check if result is not null and is not an error
			if(gpgResult.result && !gpgResult.error) {
				// Get version string from result
				let version: string = gpgResult.result.toString().trim();
				// In case of words gpg or GnuPG are include in output
				if(version.includes("gpg") && version.includes("GnuPG")) {
					// Change the status to OK
					this.changeGpgPathStatus(GpgExecPathStatus.OK);
					// Set settig variable pgpExecPath with new value
					this.plugin.settings.pgpExecPath = value;
					// Save settings with change
					await this.plugin.saveSettings();
					// End this check process
					return;
				// In case of words gpg or GnuPG are not include in output
				} else {
					// Change the status to No GPG In Output
					this.changeGpgPathStatus(GpgExecPathStatus.NO_GPG_IN_OUTPUT);
					// End this check process
					return;
				}
			// In case of result null or error
			} else {
				// Change the status to Unknown Error
				this.changeGpgPathStatus(GpgExecPathStatus.UNKNOWN_ERROR);
				// End this check process throwing an exception
				throw gpgResult.error;
			}
		}
		// In case of exception
		catch(ex)
		{
			// Check wich error code was
			switch (ex.code)
			{
				// In case or ENOENT
				case "ENOENT":
					// Change the status to File Not Found
					this.changeGpgPathStatus(GpgExecPathStatus.FILE_NOT_FOUND);
					break;
				// In case or EACCES or EPERM
				case "EACCES":
				case "EPERM":
					// Change the status to Not Permission
					this.changeGpgPathStatus(GpgExecPathStatus.NOT_PERMISSION);
					break;
				// In another error code
				default:
					// Change the status to Unknown Error
					this.changeGpgPathStatus(GpgExecPathStatus.UNKNOWN_ERROR);
					break;
			}
			// End this check process throwing an exception
			throw ex;
		}
	}

	// Function to change GPG executable path status
	private changeGpgPathStatus(status: GpgExecPathStatus) {
		// Change text status with new one
		this.gpgExecPathStatus.setText(`Status: ${status}`);
		// Swich to identify status style
		switch (status) {
			// In case of Loading status
			case GpgExecPathStatus.LOADING:
				// Change to orange color
				this.gpgExecPathStatus.className = "text-color-orange";
				break;
			// In case of OK status
			case GpgExecPathStatus.OK:
				// Change to green color
				this.gpgExecPathStatus.className = "text-color-green";
				break;
			// In case of error status
			default:
				// Change to red color
				this.gpgExecPathStatus.className = "text-color-red";
				break;
		}
	}
}
