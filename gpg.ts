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
  
      const gpgArgs = args.concat(args);
      const buffers: Buffer[] = [];
      let buffersLength = 0;
      let error = "";
      const gpg = spawn(exec, globalArgs.concat(gpgArgs));
  
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
