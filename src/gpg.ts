import { spawn } from "child_process";
import { GpgEncryptSettings } from "./Settings";

// Default and Global Args
const globalArgs: string[] = ["--batch"];

// Object that is returned when spawnGPG method is called
export interface GpgResult {
    result?: Buffer;
    error?: Error;
}

// Function to get Aditional Args
function AditionalArgs(settings: GpgEncryptSettings): string[] {
  // Set Aditional Args for each gpg function
  let aditionalArgs: string[] = [];
  // If pgpAlwaysTrust is turn on
  if (settings.pgpAlwaysTrust) {
    // Add two new Default Args in each gpg function
    aditionalArgs = aditionalArgs.concat(["--trust-model", "always"]);
  }
  // Return list of Aditional Args
  return aditionalArgs;
}

// Function to execute GPG command with some arguments and input text
export default function spawnGPG(settings: GpgEncryptSettings,  input: string | Buffer | null, args?: string[]): Promise<GpgResult> {
    // New Promise to resolve when GPG command is executed
    return new Promise((resolve) => {
      // Try to catch all exceptions
      try {
        // In case of args are null
        if (!args) {
          // Create an empty args array
          args = [];
        }
        let fullArgs: string[] = globalArgs.concat(args);

        // Initial variables
        const buffers: Buffer[] = [];
        let buffersLength = 0;
        let error = "";

        let command = "";
        if (settings.pgpAditionalCommands && settings.pgpAditionalCommandsBefore !== '') {
          command = settings.pgpAditionalCommandsBefore + " && ";
        }
        command += settings.pgpExecPath;
        fullArgs.forEach(arg => {
          command += " " + arg;
        });
        if (settings.pgpAditionalCommands && settings.pgpAditionalCommandsAfter !== '') {
          command += " && " + settings.pgpAditionalCommandsAfter;
        }
        const gpg = spawn(command, { shell: true });
    
        gpg.stdout.on("data", (buf: Buffer) => {
          buffers.push(buf);
          buffersLength += buf.length;
        });
    
        gpg.stderr.on("data", (buf: Buffer) => {
          error += buf.toString("utf8");
        });
    
        gpg.on("close", (code: number) => {
          const msg = Buffer.concat(buffers, buffersLength);
          if (code !== 0) {
            resolve({
              result: undefined,
              error: new Error(error || msg.toString())
            });
          }
          resolve({
            result: msg,
            error: error.length > 0 ? new Error(error) : undefined
          });
        });
    
        gpg.on("error", (err: any) => {
          resolve({
            result: undefined,
            error: err
          });
        });

        if (input) {
          gpg.stdin.end(input);
        }
      }
      // In case of exception
      catch (ex) {
        // Resolve with exception message
        resolve({
          result: undefined,
          error: ex
        });
      }
    });
}

// Get list of all Public Key availables
export async function getListPublicKey(settings: GpgEncryptSettings): Promise<{ keyID: string; userID: string }[]> {
  // Build the executable and args
  const gpgResult: GpgResult  = await spawnGPG(settings, null, ["--logger-fd", "1", "--list-public-keys", "--with-colons"]);
  // Check if result are null
  if(!gpgResult.result) {
    // And return a null array
    return [];
  }
  // Split the result by lines
  const lines = gpgResult.result.toString().trim().split("\n");
  // Create initial variables
  const keys: { keyID: string; userID: string }[] = [];
  let currentKeyID: string | null = null;
  // Iterate over each line
  for (const line of lines) {
    // Split the line by colons
    const parts = line.split(":");
    // If the line starts with 'pub', then it's a public key line
    if (parts[0] === "pub") {
      // The key ID is in the 5 position
      currentKeyID = parts[4];
    } 
    // If the line starts with 'uid', then it's a user ID line
    if (parts[0] === "uid" && currentKeyID) {
      // The user ID is in the 10 position
      keys.push({
        keyID: currentKeyID,
        userID: parts[9]
      });
    }
  }
  // Return keys
  return keys;
}

// Function to encrypt a plainText with a list of GPG public keys ID
export async function gpgEncrypt(settings: GpgEncryptSettings, plainText:string, publicKeyIds: string[], signPublicKeyId: string): Promise<GpgResult> {
  // Check if at least one public key is selected
  if (publicKeyIds.length <= 0) {
    // And return with error message
    return {
      result: undefined,
      error: new Error("❌ Select at least one key")
    };
  }
  // List of Args before publicKeyIds
  let args: string[] = ["--encrypt", "--armor"].concat(AditionalArgs(settings));
  // Check if Sign is necesary in this encryption
  if (signPublicKeyId != "0") {
    // Add args to Sign with a key
    args = args.concat(["--sign", "--local-user", signPublicKeyId]);
  }
  // Iterate over each GPG public key ID
  publicKeyIds.forEach((publicKey) => {
    // Add to args this recipient GPG public key ID
    args = args.concat(["--recipient", publicKey]);
  });
  // Build the executable and args
  const gpgResult: GpgResult = await spawnGPG(settings, plainText, args);
  // Check if error is null
  if(gpgResult.error) {
    // Return with error message
    return gpgResult;
  }
  // Check if result is null
  if(!gpgResult.result) {
    // And return with error message
    return {
      result: undefined,
      error: new Error("❌ Encrypt failed, result is empty")
    };
  }
  // Send resposnse with encripted text
  return {
    result: gpgResult.result,
    error: undefined
  };
}


// Function to decrypt an encrypted text with a private key
export async function gpgDecrypt(settings: GpgEncryptSettings, encryptedText:string): Promise<GpgResult> {
  // List of Args before publicKeyIds
  let args: string[] = ["--decrypt"].concat(AditionalArgs(settings));
  // Build the executable and args
  const gpgResult: GpgResult = await spawnGPG(settings, encryptedText, args);
  // Check if error is null
  if(gpgResult.error) {
    // Return with error message
    return gpgResult;
  }
  // Check if result is null
  if(!gpgResult.result) {
    // And return with error message
    return {
      result: undefined,
      error: new Error("❌ Decrypt failed, result is empty")
    };
  }
  // Send resposnse with encripted text
  return {
    result: gpgResult.result,
    error: undefined
  };
}