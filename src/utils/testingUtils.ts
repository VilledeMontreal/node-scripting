import caporal from '@caporal/core';
import { globalConstants } from '@villedemontreal/general-utils';
import { assert } from 'chai';
import { exec, execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { configs } from '../config/configs.js';

const execAsync = promisify(exec);

export function setTestingConfigs() {
  configs.setCaporal(caporal.program);
  configs.setProjectRoot(configs.libRoot);
  configs.setProjectOutDir(path.join(configs.libRoot, 'dist'));
}

export function containsText(corpus: string, text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return false;
  }
  let lastIdx = -1;
  for (const line of lines) {
    const idx = corpus.indexOf(line, lastIdx);
    if (idx < 0) {
      console.log('Could not find line', line, 'in corpus', corpus);
      return false;
    }
    lastIdx = idx;
  }
  return true;
}

export async function run(...args: string[]) {
  return await runCore(configs.isWindows ? 'run.cmd' : './run', ...args);
}

export async function runCore(runFilePath: string, ...args: string[]) {
  const env = { ...process.env };
  const escapedArgs = args.map((x) => `"${x.replace('"', '"')}"`);
  try {
    const result = await execAsync(`${runFilePath} ${escapedArgs.join(' ')}`, { env });
    return { output: result.stdout, isSuccess: true };
  } catch (err: any) {
    return { output: err.stdout + err.stderr, isSuccess: false };
  }
}

export function isMainHelpDisplayed(output: string) {
  return (
    output.indexOf(`to get some help about a command`) > -1 &&
    output.indexOf(`A simple testing script`) > -1 &&
    output.indexOf(`A testing hidden script`) <= -1
  );
}

export async function withCustomRunFile(
  toReplaceInRunFile: string,
  replacement: string,
  ...runArgs: string[]
): Promise<{ output: string; isSuccess: boolean }> {
  const runTestingFilePath = `${configs.libRoot}/runTesting`;
  let runContent = fs.readFileSync(`${configs.libRoot}/run`, 'utf-8');
  runContent = runContent.replace(toReplaceInRunFile, replacement);

  const runCmdTestingFilePath = `${configs.libRoot}/runTesting.cmd`;
  let runCmdContent = fs.readFileSync(`${configs.libRoot}/run.cmd`, 'utf-8');
  runCmdContent = runCmdContent.replace(`"%~dp0\\run"`, `"%~dp0\\runTesting"`);

  try {
    fs.writeFileSync(runTestingFilePath, runContent, 'utf-8');
    if (!configs.isWindows) {
      execSync(`chmod +x ${runTestingFilePath}`);
    }
    fs.writeFileSync(runCmdTestingFilePath, runCmdContent, 'utf-8');

    const { output, isSuccess } = await runCore(
      configs.isWindows ? 'runTesting.cmd' : './runTesting',
      ...runArgs,
    );
    return { output, isSuccess };
  } finally {
    if (fs.existsSync(runTestingFilePath)) {
      fs.unlinkSync(runTestingFilePath);
    }
    if (fs.existsSync(runCmdTestingFilePath)) {
      fs.unlinkSync(runCmdTestingFilePath);
    }
  }
}

export async function withLogNodeInstance(
  ...runArgs: string[]
): Promise<{ output: string; isSuccess: boolean }> {
  const mainJsPath = path.join(configs.libRoot, 'dist/src/main.js');
  const mainJsCodeOriginal = fs.readFileSync(mainJsPath, 'utf8');

  try {
    const anchor = `addUnhandledRejectionHandler();`;
    assert.isTrue(mainJsCodeOriginal.indexOf(anchor) > -1);

    const outputCode = `console.info('MAIN NODE_APP_INSTANCE: ' + process.env.${globalConstants.envVariables.NODE_APP_INSTANCE});`;

    const newCode = mainJsCodeOriginal.replace(anchor, `${anchor}\n${outputCode}`);
    fs.writeFileSync(mainJsPath, newCode, 'utf8');

    const { output, isSuccess } = await run(...runArgs);
    return { output, isSuccess };
  } finally {
    fs.writeFileSync(mainJsPath, mainJsCodeOriginal, 'utf8');
  }
}

export interface TextAssertion {
  kind: 'startsWith' | 'endsWith' | 'contains' | 'equals';
  value: string | string[];
  invert?: boolean;
}

export function assertText(text: string, assertions: TextAssertion[]) {
  if (!text) {
    throw new Error('empty text');
  }
  for (const assertion of assertions) {
    let isValid = false;
    const values = typeof assertion.value === 'string' ? [assertion.value] : assertion.value;
    for (const value of values) {
      switch (assertion.kind) {
        case 'startsWith':
          isValid = text.startsWith(value);
          break;
        case 'endsWith':
          isValid = text.endsWith(value);
          break;
        case 'contains':
          isValid = text.includes(value);
          break;
        case 'equals':
          isValid = text === value;
          break;
        default:
          throw new Error(`Unknown kind '${assertion.kind}'`);
      }
      if (isValid) {
        break;
      }
    }
    if (assertion.invert === true) {
      isValid = !isValid;
    }
    if (!isValid) {
      throw new Error(
        `Text assertion failed: kind=${assertion.kind} ${assertion.invert ? 'inverted' : ''}\nExpected:\n${assertion.value}\nText:\n${text}`,
      );
    }
  }
}
