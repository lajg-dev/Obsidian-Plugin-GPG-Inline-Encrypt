import spawnGPG, { GpgResult, getListPublicKey } from 'src/gpg';
import { App, DropdownComponent, PluginSettingTab, Setting } from 'obsidian';
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
	private gpgAditionalCommands: Setting;
	private gpgAditionalCommandsBefore: Setting;
	private gpgAditionalCommandsAfter: Setting;
	private gpgAditionalCommandsConsole: Setting;
	private gpgExecPathStatus: HTMLDivElement;
	private gpgAditionalCommandsWarning: HTMLDivElement;
	private gpgPublicKeysList: Setting;
	private gpgSignKeyId: Setting;
	private gpgAlwaysTrust: Setting;
	private gpgLibrary: Setting;
    // Display function in settings tabs
	display(): void {
		// Container Element
		const {containerEl} = this;
		// Clear continer element
		containerEl.empty();

		// ---------- GPG Library ----------
		this.gpgLibrary = new Setting(containerEl)
			.setName("GPG Library")
			.setDesc("Select which GPG library you want to use (Tip: If you want the app to work on mobile devices, use openpgpjs)")
			.addDropdown((dropdown: DropdownComponent) => {
				// Option to support openpgpjs
				dropdown.addOption("openpgpjs", "openpgpjs");
				// Option to use CLI commands
				dropdown.addOption("cli", "CLI commands");
				// Set the current settings value (default value is openpgpjs)
				dropdown.setValue(this.plugin.settings.pgpLibrary);
				// When value is change
				dropdown.onChange((value: string) => {
					// Set the new pgpLibrary value
					this.plugin.settings.pgpLibrary = value;
					// Call method to refresh library
					this.RefreshLibrary(value);
				})
			});
		// ---------- GPG Library ----------

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
			.setName("Public keys")
		// Run by first time checkGpgPath function
		this.checkGpgPath(this.plugin.settings.pgpExecPath);
		// ---------- List of GPG Public Keys ----------

		// ---------- Always Trust ----------
		this.gpgAlwaysTrust = new Setting(containerEl)
		.setName("Always trust any key")
		.setDesc("Always trust any used GPG key")
		.addToggle((toggle) => {
			// Toggle component default value is false
			toggle.setValue(this.plugin.settings.pgpAlwaysTrust);
			// Toggle component is created with onChange event
			toggle.onChange(async (value: boolean) => {
				// Set settig variable pgpAlwaysTrust with new value
				this.plugin.settings.pgpAlwaysTrust = value;
				// Save settings with change
				await new Settings(this.plugin).saveSettings();
			});
		});
		// ---------- Always Trust ----------

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

		// ---------- Aditional Commands ----------
		this.gpgAditionalCommands = new Setting(containerEl)
			.setName("Aditional commands")
			.setDesc("Add custom commands to be executed before or after the gpg command calls")
			.addToggle((toggle) => {
				// Toggle component default value is false
				toggle.setValue(this.plugin.settings.pgpAditionalCommands);
				// Toggle component is created with onChange event
				toggle.onChange((value: boolean) => {
					// Call method to show/hide aditional commands
					this.RefreshAditionalCommands(value);
				});
			});
		// Div to show an advance users wraning
		this.gpgAditionalCommandsWarning = this.gpgAditionalCommands.descEl.createDiv();
		this.gpgAditionalCommandsWarning.setText('Warning: Only advance users');
		// Change to red color
		this.gpgAditionalCommandsWarning.className = "text-color-red";
		// Create the Aditional Commands Before/After
		this.gpgAditionalCommandsBefore = new Setting(containerEl);
		this.gpgAditionalCommandsAfter = new Setting(containerEl);
		this.gpgAditionalCommandsConsole = new Setting(containerEl);
		// Call method to refresh library
		this.RefreshLibrary(this.plugin.settings.pgpLibrary);
		// Call method to show/hide aditional commands
		this.RefreshAditionalCommands(this.plugin.settings.pgpAditionalCommands);
		// ---------- Aditional Commands ----------
	}

	// Function to check if GPG Path exits
	private async checkGpgPath(value: string) {
		// Check if pgp Library is openpgpjs
		if (this.plugin.settings.pgpLibrary == "openpgpjs")
			// Abort the process
			return;
		// Set settig variable pgpExecPath with new value
		this.plugin.settings.pgpExecPath = value;
		// Save settings with change
		await new Settings(this.plugin).saveSettings();
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
			let gpgResult: GpgResult = await spawnGPG(this.plugin.settings, null, ["--logger-fd", "1", "--version"]);
			// Check if result is not null and is not an error
			if(gpgResult.result && !gpgResult.error) {
				// Get version string from result
				let version: string = gpgResult.result.toString().trim();
				// In case of words gpg or GnuPG are include in output
				if(version.includes("gpg") && version.includes("GnuPG")) {
					// Change the status to OK
					this.changeGpgPathStatus(GpgExecPathStatus.OK);
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
		let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin.settings);
		// Iterate over each sub-element in list
		while (this.gpgPublicKeysList.descEl.firstChild) {
			// Remove each sub-element in list to clear list
			this.gpgPublicKeysList.descEl.removeChild(this.gpgPublicKeysList.descEl.firstChild);
		}
		// Add description in element
		this.gpgPublicKeysList.setDesc("List of GPG public keys (Mark the keys that by default will be used for encryption).");
		// Add spacer element to separate title/description and list of public keys
		this.gpgPublicKeysList.descEl.createDiv().className = "div-spacer";
		// Iterate over each public key
		gpgPublicKeys.forEach((gpgPublicKey) => {
			// A div is created for each element
			let div : HTMLDivElement = this.gpgPublicKeysList.descEl.createDiv();
			// An element of type setting is created that will have the toggle
			let item: Setting = new Setting(div);
			// The keyID is configured as Name
			item.setName(gpgPublicKey.keyID);
			// The userID is configured as a Desc
			item.setDesc(gpgPublicKey.userID);
			// Toggle is added to mark or unmark as default key
			item.addToggle((toggle) => {
				// Toggle component default value
				toggle.setValue(this.plugin.settings.pgpDefaultEncryptKeys.indexOf(gpgPublicKey.keyID) > -1);
				// Toggle component is created with onChange event
				toggle.onChange(async (value: boolean) => {
					// Check if change is true and value not exists in pgpDefaultEncryptKeys
					if (value && this.plugin.settings.pgpDefaultEncryptKeys.indexOf(gpgPublicKey.keyID) == -1) {
						// Add new publicKey in the list of default keys
						this.plugin.settings.pgpDefaultEncryptKeys.push(gpgPublicKey.keyID);
					}
					// Check if change is false and value exists in pgpDefaultEncryptKeys
					else if (!value && this.plugin.settings.pgpDefaultEncryptKeys.indexOf(gpgPublicKey.keyID) > -1) {
						//Remove publicKey from list of default keys
						this.plugin.settings.pgpDefaultEncryptKeys.remove(gpgPublicKey.keyID);
					}
					// Save settings with change
					await new Settings(this.plugin).saveSettings();
				});
			});
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
			let gpgPublicKeys: { keyID: string; userID: string }[] = await getListPublicKey(this.plugin.settings);
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

	// Function to refresh List of Sign Keys ID
	private async RefreshAditionalCommands(aditionalCommands: boolean) {
		// Clear gpgAditionalCommands setting
		this.gpgAditionalCommandsBefore.clear();
		this.gpgAditionalCommandsAfter.clear();
		this.gpgAditionalCommandsConsole.clear();
		// Re-Create gpgAditionalCommands setting
		this.gpgAditionalCommandsBefore.setName("Additional Commands (Before)");
		this.gpgAditionalCommandsAfter.setName("Additional Commands (After)");
		this.gpgAditionalCommandsConsole.setName("Print command in Obsidian Developer Console");
		this.gpgAditionalCommandsBefore.setDesc("Enter the commands to be executed before running the gpg commands (Note: If you need to nest more than one command use &&, DO NOT include closing characters && as these will be added automatically)");
		this.gpgAditionalCommandsAfter.setDesc("Enter the commands to be executed after running the gpg commands (Note: If you need to nest more than one command use &&, DO NOT include closing characters && as these will be added automatically)");
		this.gpgAditionalCommandsConsole.setDesc("Print whole command in the Obsidian Developer Console to debug (cmd+option+i Mac - ctrl+shift+i Windows)");
		// Show or Hide gpgAditionalCommands settings according aditionalCommands flag
		aditionalCommands ? this.gpgAditionalCommandsBefore.settingEl.show() : this.gpgAditionalCommandsBefore.settingEl.hide();
		aditionalCommands ? this.gpgAditionalCommandsAfter.settingEl.show() : this.gpgAditionalCommandsAfter.settingEl.hide();
		aditionalCommands ? this.gpgAditionalCommandsConsole.settingEl.show() : this.gpgAditionalCommandsConsole.settingEl.hide();
		// Added the text inputs
		this.gpgAditionalCommandsBefore.addText(text => text
			.setPlaceholder('command')
			.setValue(this.plugin.settings.pgpAditionalCommandsBefore)
			.onChange(async (value: string) => {
				// Set settig variable pgpAditionalCommandsBefore with new value
				this.plugin.settings.pgpAditionalCommandsBefore = value;
				// Save settings with change
				await new Settings(this.plugin).saveSettings();
				// Run a script to check gpg path with pgpAditionalCommandsBefore
				await this.checkGpgPath(this.plugin.settings.pgpExecPath);
			}));
		this.gpgAditionalCommandsAfter.addText(text => text
			.setPlaceholder('command')
			.setValue(this.plugin.settings.pgpAditionalCommandsAfter)
			.onChange(async (value: string) => {
				// Set settig variable pgpAditionalCommandsAfter with new value
				this.plugin.settings.pgpAditionalCommandsAfter = value;
				// Save settings with change
				await new Settings(this.plugin).saveSettings();
				// Run a script to check gpg path with pgpAditionalCommandsAfter
				await this.checkGpgPath(this.plugin.settings.pgpExecPath);
			}));
		this.gpgAditionalCommandsConsole.addToggle((toggle) => {
			// Toggle component default value is false
			toggle.setValue(this.plugin.settings.pgpAditionalCommandsConsole);
			// Toggle component is created with onChange event
			toggle.onChange(async (value: boolean) => {
				// Set settig variable pgpAditionalCommandsConsole with new value
				this.plugin.settings.pgpAditionalCommandsConsole = value;
				// Save settings with change
				await new Settings(this.plugin).saveSettings();
			});
		});
		// Set settig variable pgpAditionalCommands with new value
		this.plugin.settings.pgpAditionalCommands = aditionalCommands;
		// Save settings with change
		await new Settings(this.plugin).saveSettings();
	}

	// Function to refresh pgp library
	private RefreshLibrary(value: string) {
		// Check if library is openpgpjs
		if (value == "openpgpjs")
		{
			// Set aditional commands to false when openpgpjs
			this.plugin.settings.pgpAditionalCommands = false;
			// And hide the aditional commands settings
			this.gpgAditionalCommands.settingEl.hide();
			this.gpgExecPath.settingEl.hide();
			this.gpgPublicKeysList.settingEl.hide();
			this.gpgSignKeyId.settingEl.hide();
			this.gpgAlwaysTrust.settingEl.hide();
		}
		// Check if library is not openpgpjs
		else
		{
			// And show the aditional commands settings
			this.gpgAditionalCommands.settingEl.show();
			this.gpgExecPath.settingEl.show();
			this.gpgPublicKeysList.settingEl.show();
			this.gpgAlwaysTrust.settingEl.show();
			if (this.plugin.settings.pgpSignPublicKeyId != "0")
				this.gpgSignKeyId.settingEl.show();


			this.checkGpgPath(this.plugin.settings.pgpExecPath);
		}

		// Call method to show/hide aditional commands
		this.RefreshAditionalCommands(this.plugin.settings.pgpAditionalCommands);
	}
}
