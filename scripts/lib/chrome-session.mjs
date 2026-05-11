import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

export const chromeConfig = {
  cdpUrl: process.env.CHROME_CDP_URL || "http://127.0.0.1:9222",
  remotePort: process.env.CHROME_REMOTE_PORT || "9222",
  userDataDir: path.resolve(
    process.cwd(),
    process.env.CHROME_USER_DATA_DIR || ".chrome-profile/collector"
  ),
  executable:
    process.env.CHROME_EXECUTABLE ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getCdpVersionUrl = () => `${chromeConfig.cdpUrl}/json/version`;

export const isCdpReady = async () => {
  try {
    const response = await fetch(getCdpVersionUrl());
    return response.ok;
  } catch {
    return false;
  }
};

export const waitForCdpReady = async (timeoutMs = 15000, pollMs = 500) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isCdpReady()) {
      return true;
    }
    await sleep(pollMs);
  }

  return false;
};

export const launchRemoteChrome = async () => {
  if (!fs.existsSync(chromeConfig.executable)) {
    throw new Error(
      `Chrome executable not found: ${chromeConfig.executable}. Set CHROME_EXECUTABLE if needed.`
    );
  }

  fs.mkdirSync(chromeConfig.userDataDir, { recursive: true });

  const child = spawn(
    chromeConfig.executable,
    [
      `--remote-debugging-port=${chromeConfig.remotePort}`,
      `--user-data-dir=${chromeConfig.userDataDir}`,
      "--no-first-run"
    ],
    {
      detached: true,
      stdio: "ignore"
    }
  );

  child.unref();

  const ready = await waitForCdpReady();
  if (!ready) {
    throw new Error(
      `Started Chrome, but CDP was not ready at ${chromeConfig.cdpUrl} within the timeout.`
    );
  }

  return {
    cdpUrl: chromeConfig.cdpUrl,
    userDataDir: chromeConfig.userDataDir
  };
};

export const ensureRemoteChrome = async () => {
  if (await isCdpReady()) {
    return {
      cdpUrl: chromeConfig.cdpUrl,
      launched: false
    };
  }

  const result = await launchRemoteChrome();
  return {
    ...result,
    launched: true
  };
};

export const launchCollectorContext = async () => {
  if (!fs.existsSync(chromeConfig.executable)) {
    throw new Error(
      `Chrome executable not found: ${chromeConfig.executable}. Set CHROME_EXECUTABLE if needed.`
    );
  }

  fs.mkdirSync(chromeConfig.userDataDir, { recursive: true });

  return chromium.launchPersistentContext(chromeConfig.userDataDir, {
    executablePath: chromeConfig.executable,
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--no-first-run",
      "--disable-blink-features=AutomationControlled",
      "--lang=zh-CN"
    ],
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai"
  });
};
