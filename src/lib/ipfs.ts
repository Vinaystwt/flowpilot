import "server-only";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { access, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface IpfsAttempt {
  provider: string;
  ok: boolean;
  message: string;
}

export interface IpfsUploadResult {
  cid: string;
  ipfsUrl: string;
  provider: string;
  real: true;
  attempts: IpfsAttempt[];
}

export class IpfsUploadError extends Error {
  attempts: IpfsAttempt[];

  constructor(message: string, attempts: IpfsAttempt[]) {
    super(message);
    this.name = "IpfsUploadError";
    this.attempts = attempts;
  }
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function hasStorachaCliConfig() {
  return Boolean(readEnv("STORACHA_SPACE_DID"));
}

function getGatewayUrl(provider: string, cid: string) {
  if (provider === "storacha-cli") {
    return `https://storacha.link/ipfs/${cid}`;
  }

  if (provider === "lighthouse") {
    return `https://gateway.lighthouse.storage/ipfs/${cid}`;
  }

  return `https://ipfs.io/ipfs/${cid}`;
}

function asMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown upload error";
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getStorachaCommand() {
  const localBinary = join(process.cwd(), "node_modules", ".bin", "storacha");

  try {
    await access(localBinary);
    return {
      command: localBinary,
      baseArgs: [] as string[],
    };
  } catch {
    return {
      command: "npx",
      baseArgs: ["@storacha/cli"] as string[],
    };
  }
}

async function uploadToNftStorage(content: string, filename: string) {
  const token = readEnv("NFT_STORAGE_TOKEN", "NFT_STORAGE_KEY");
  if (!token) {
    throw new Error("NFT.storage credentials are missing");
  }

  const response = await fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-NAME": filename,
    },
    body: new Blob([content], { type: "application/json" }),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `NFT.storage returned ${response.status}`);
  }

  const cid = payload?.value?.cid;
  if (!cid) {
    throw new Error("NFT.storage returned no CID");
  }

  return cid as string;
}

async function uploadToWeb3Storage(content: string, filename: string) {
  const token = readEnv("WEB3_STORAGE_TOKEN");
  if (!token) {
    throw new Error("web3.storage token is missing");
  }

  const response = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-NAME": filename,
    },
    body: new Blob([content], { type: "application/json" }),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.message || `web3.storage returned ${response.status}`);
  }

  const cid = payload?.cid;
  if (!cid) {
    throw new Error("web3.storage returned no CID");
  }

  return cid as string;
}

async function uploadToLighthouse(content: string, filename: string) {
  const token = readEnv("LIGHTHOUSE_API_KEY");
  if (!token) {
    throw new Error("Lighthouse API key is missing");
  }

  const formData = new FormData();
  formData.append("file", new Blob([content], { type: "application/json" }), filename);

  const response = await fetch("https://node.lighthouse.storage/api/v0/add", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error || `Lighthouse returned ${response.status}`);
  }

  const cid = payload?.Hash || payload?.cid || payload?.IpfsHash;
  if (!cid) {
    throw new Error("Lighthouse returned no CID");
  }

  return cid as string;
}

async function uploadToPinata(content: string, filename: string) {
  const token = readEnv("PINATA_JWT");
  if (!token) {
    throw new Error("Pinata JWT is missing");
  }

  const formData = new FormData();
  formData.append("network", "public");
  formData.append("name", filename);
  formData.append("file", new Blob([content], { type: "application/json" }), filename);

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.reason || payload?.error?.details || `Pinata returned ${response.status}`);
  }

  const cid = payload?.data?.cid;
  if (!cid) {
    throw new Error("Pinata returned no CID");
  }

  return cid as string;
}

async function selectStorachaSpace(spaceDid: string) {
  const cli = await getStorachaCommand();
  await execFileAsync(
    cli.command,
    [...cli.baseArgs, "space", "use", spaceDid],
    {
      env: process.env,
      cwd: process.cwd(),
    }
  );
}

async function uploadToStorachaCli(content: string, filename: string) {
  const spaceDid = readEnv("STORACHA_SPACE_DID");
  if (!spaceDid) {
    throw new Error("Storacha space is not configured");
  }

  const tempPath = join(tmpdir(), `flowpilot-${randomUUID()}-${filename}`);

  try {
    await writeFile(tempPath, content, "utf8");
    await selectStorachaSpace(spaceDid);
    const cli = await getStorachaCommand();

    const { stdout, stderr } = await execFileAsync(
      cli.command,
      [...cli.baseArgs, "up", tempPath, "--json", "--no-wrap"],
      {
        env: process.env,
        cwd: process.cwd(),
      }
    );

    const combinedOutput = `${stdout}\n${stderr}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const jsonLine = [...combinedOutput]
      .reverse()
      .find((line) => line.startsWith("{") && line.endsWith("}"));

    if (!jsonLine) {
      throw new Error("Storacha CLI returned no JSON upload result");
    }

    const payload = JSON.parse(jsonLine);
    const cid = payload?.root?.["/"] || payload?.root || payload?.cid;

    if (!cid || typeof cid !== "string") {
      throw new Error("Storacha CLI returned no root CID");
    }

    return cid;
  } finally {
    await rm(tempPath, { force: true });
  }
}

export async function uploadJsonToIpfs(
  payload: unknown,
  filename: string
): Promise<IpfsUploadResult> {
  const content = JSON.stringify(payload, null, 2);
  const attempts: IpfsAttempt[] = [];

  const providers = [
    ...(hasStorachaCliConfig()
      ? [{ name: "storacha-cli", upload: uploadToStorachaCli as typeof uploadToNftStorage }]
      : []),
    { name: "pinata", upload: uploadToPinata },
    { name: "nft.storage", upload: uploadToNftStorage },
    { name: "web3.storage", upload: uploadToWeb3Storage },
    { name: "lighthouse", upload: uploadToLighthouse },
  ] as const;

  for (const provider of providers) {
    try {
      const cid = await provider.upload(content, filename);
      attempts.push({ provider: provider.name, ok: true, message: "Upload succeeded" });

      return {
        cid,
        ipfsUrl: getGatewayUrl(provider.name, cid),
        provider: provider.name,
        real: true,
        attempts,
      };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        ok: false,
        message: asMessage(error),
      });
    }
  }

  throw new IpfsUploadError("IPFS upload failed across every configured provider.", attempts);
}
