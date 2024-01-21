import spawnGPG, { GpgResult, getListPublicKey } from 'src/gpg';
import { App, PluginSettingTab, Setting } from 'obsidian';
import GpgEncryptPlugin from 'main';
import { Settings } from './Settings';
let fs = require('fs');

// Enum of types of GPG executable path status
enum GpgExecPathStatus {
	OK = "Ok",
	LOADING = "Loading...",
	NO_GPG_IN_PATH = "GPG is not in this path",
	UNKNOWN_ERROR = "An unknown error occurred",
	FILE_NOT_FOUND = "File or directory not found",
	NO_GPG_IN_OUTPUT = "The output does not indicate this is GPG",
	NOT_PERMISSION = "Access to the executable file has been denied"
}

// GPG Settings Tab Class
export class GpgSettingsTab extends PluginSettingTab {
    // Current plugin instance
	plugin: GpgEncryptPlugin;
    // Constructor with App and GpgEncryptPlugin
	constructor(app: App, plugin: GpgEncryptPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	// List of settings objetcts
	private gpgExecPath: Setting;
	private gpgExecPathStatus: HTMLDivElement;
	private gpgPublicKeysList: Setting;
	private gpgSignKeyId: Setting;
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
		// ---------- GPG executable setting ----------

		// ---------- List of GPG Public Keys ----------
		this.gpgPublicKeysList = new Setting(containerEl)
			.setName("Public Keys")
		// Run by first time checkGpgPath function
		this.checkGpgPath(this.plugin.settings.pgpExecPath);
		// ---------- List of GPG Public Keys ----------

		// ---------- Sign text ----------
		new Setting(containerEl)
			.setName("Sign encrypted text")
			.setDesc("Sign the encrypted text with GPG")
			.addToggle((toggle) => {
				// Toggle component default value is false
				toggle.setValue(this.plugin.settings.pgpSignPublicKeyId != "0");
				// Toggle component is created with onChange event
				toggle.onChange((value: boolean) => {
					// Call method to refresh list to Sign text
					this.RefreshListSign(value);
				});
			});
		// ---------- Sign text ----------

		// ---------- GPG Key ID to Sign text ----------
		this.gpgSignKeyId = new Setting(containerEl);
		// Call method to refresh list to Sign text
		this.RefreshListSign(this.plugin.settings.pgpSignPublicKeyId != "0");
		// ---------- GPG Key ID to Sign text ----------
	}

	// Function to check if GPG Path exits
	private async checkGpgPath(value: string) {
		// Hide list of public GPG Keys
		this.gpgPublicKeysList.settingEl.hide();
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
					await new Settings(this.plugin).saveSettings();
					// Refresh GPG public key list
					await this.RefreshGpgPublicKeyList();
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

	// Function to refresh list of GPG Public Keys
	private async RefreshGpgPublicKeyList() {
		// Get list of GPG public Keys
		let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin.settings.pgpExecPath);
		// Iterate over each sub-element in list
		while (this.gpgPublicKeysList.descEl.firstChild) {
			// Remove each sub-element in list to clear list
			this.gpgPublicKeysList.descEl.removeChild(this.gpgPublicKeysList.descEl.firstChild);
		}
		// Add description in element
		this.gpgPublicKeysList.setDesc("List of GPG public keys");
		// Add spacer element to separate title/description and list of public keys
		this.gpgPublicKeysList.descEl.createDiv().className = "div-spacer";
		// Iterate over each public key
		gpgPublicKeys.forEach((gpgPublicKey) => {
			// Add public key as new element in list
			this.gpgPublicKeysList.descEl.createDiv().setText("- (" + gpgPublicKey.keyID + ") " + gpgPublicKey.userID);
		});
		// Show list of public GPG Keys
		this.gpgPublicKeysList.settingEl.show();
	}

	// Function to refresh List of Sign Keys ID
	private async RefreshListSign(requireSign: boolean) {
		// Clear gpgSignKeyId setting
		this.gpgSignKeyId.clear();
		// Re-Create gpgSignKeyId setting
		this.gpgSignKeyId.setName("GPG key to sign");
		this.gpgSignKeyId.setDesc("GPG key to sign the encrypted text");
		// Show or Hide gpgSignKeyId settings according requireSign flag
		requireSign ? this.gpgSignKeyId.settingEl.show() : this.gpgSignKeyId.settingEl.hide();
		// Check ir requireSign to populate DropDown
		if (requireSign) {
			// Get list of GPG public Keys
			let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin.settings.pgpExecPath);
			// Clear all DropDown items
			this.gpgSignKeyId.addDropdown(dropDown => {
				// Add empty key as new element in list
				dropDown.addOption("0", "Select a key to sign")
				// Iterate over each public key
				gpgPublicKeys.forEach((gpgPublicKey) => {
					// Add public key as new element in list
					dropDown.addOption(gpgPublicKey.keyID, "(" + gpgPublicKey.keyID + ") " + gpgPublicKey.userID)
				});
				// DropDown component onChange event
				dropDown.onChange(async (value: string) => {
					// Set settig variable pgpSignPublicKeyId with new value
					this.plugin.settings.pgpSignPublicKeyId = value;
					// Save settings with change
					await new Settings(this.plugin).saveSettings();
				});
				// Select as default 0=Select a key to sign
				dropDown.setValue(this.plugin.settings.pgpSignPublicKeyId);
			});
		}
		// In case of disable Sign
		else {
			// Set settig variable pgpSignPublicKeyId with new value
			this.plugin.settings.pgpSignPublicKeyId = "0";
			// Save settings with change
			await new Settings(this.plugin).saveSettings();
		}
	}
}
