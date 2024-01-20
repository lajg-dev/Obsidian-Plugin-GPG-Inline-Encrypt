import { spawn } from "child_process";

const globalArgs: string[] = ["--batch"];

export interface GpgResult {
    result?: Buffer;
    error?: Error;
}

export default function spawnGPG(exec: string,  input: string | Buffer | null, args?: string[]): Promise<GpgResult> {
    return new Promise((resolve, reject) => {
      if (!args) {
        args = [];
      }

      const buffers: Buffer[] = [];
      let buffersLength = 0;
      let error = "";
      const gpg = spawn(exec, globalArgs.concat(args));
  
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
          reject(new Error(error || msg.toString()));
          return;
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
    });
}

// Get list of all Public Key availables
export async function getListPublicKey(exec: string): Promise<{ keyID: string; userID: string }[]> {
  // Build the executable and args
  const gpgResult: GpgResult  = await spawnGPG(exec, null, ["--logger-fd", "1", "--list-public-keys", "--with-colons"]);
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