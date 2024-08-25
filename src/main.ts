import { Action, ActionParameters, Command, Program } from '@caporal/core';
import { globalConstants } from '@villedemontreal/general-utils';
import chalk from 'chalk';
import { IScriptConstructor, ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from './scriptBase.js';

/**
 * Run a script or display some help, given
 * the specified arguments.
 *
 * The compilation must already have been done.
 */
export async function main(caporal: Program, projectScriptsIndexModule: string, argv?: string[]) {
  addUnhandledRejectionHandler();
  const localArgv = argv ?? process.argv.slice(2);

  await manageHelpCommand(caporal, localArgv);

  await addProjectScripts(caporal, projectScriptsIndexModule);

  let executedCommand: any;
  addExecutedCommandExtractor();

  try {
    await caporal.run(localArgv);
    return 0;
  } catch (err: any) {
    // ==========================================
    // Note that this error might have already been printed from
    // the BaseScript.run() method.
    // If that was the case, a tag called '__reported' was injected in
    // the error object in order to let us know that we should skip this error.
    // ==========================================
    if (!err.meta?.error?.__reported) {
      console.error(
        `${chalk.redBright('error')}: ${
          err.message ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err))
        }\n`,
      );
    }

    // ==========================================
    // We output the help (global or specific to
    // the command) on Caporal validation errors.
    // ==========================================
    await printHelpOnCaporalError(caporal, err, localArgv, executedCommand);

    return 1;
  }

  function addExecutedCommandExtractor() {
    const runOriginal = caporal['_run'].bind(caporal);
    caporal['_run'] = async function (result: any, cmd: any) {
      executedCommand = cmd;
      // eslint-disable-next-line prefer-rest-params
      return await runOriginal(...arguments);
    };
  }
}

function addUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason) => {
    console.error(`Promise rejection error : ${reason}`);
  });
}

async function manageHelpCommand(caporal: Program, localArgv: string[]) {
  const helpCommand = (await caporal.getAllCommands()).find((cmd) => cmd.name === 'help');
  if (helpCommand) {
    patchHelpCommand(caporal, helpCommand);

    // ==========================================
    // Make the "help" command the default one
    // if no command is provided.
    // ==========================================
    if (localArgv.length === 0 || (localArgv.length === 1 && localArgv[0] === '--nc')) {
      helpCommand.default();
    }
  }
}

function patchHelpCommand(caporal: Program, helpCommand: Command) {
  const oldAction: Action = (helpCommand as any)._action;
  if (!oldAction) {
    throw new Error('Expected to find the command action callback');
  }
  if ((helpCommand as any)._action.__hooked) {
    throw new Error('Help command has already been patched');
  }
  (helpCommand as any)._action = (actionParams: ActionParameters) => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) => {
      // ==========================================
      // The "help" output seems to be done asynchronously,
      // even with "await". So we use a listener.
      // ==========================================
      let result: any;
      function onHelp() {
        caporal.removeListener('help', onHelp);
        resolve(result);
      }
      caporal.addListener('help', onHelp);
      try {
        result = await oldAction(actionParams);
      } catch (err: any) {
        caporal.removeListener('help', onHelp);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(err);
      }
    });
  };
  (helpCommand as any)._action.__hooked = true;
}

async function printHelpOnCaporalError(
  caporal: Program,
  err: any,
  argv: string[],
  executedCommand: Command,
): Promise<void> {
  if (argv.includes(`--silent`) || argv.includes(`--quiet`)) {
    return;
  }

  // ==========================================
  // Unknown command, display global help
  // ==========================================
  if (
    err &&
    err.message &&
    err.message.startsWith('Unknown command ') &&
    err.meta &&
    err.meta.command
  ) {
    await executeHelp(caporal, argv);
  }

  // ==========================================
  // Command error, display command help
  // ==========================================
  if (executedCommand && err.meta && err.meta.errors) {
    await executeHelp(caporal, argv, executedCommand.name);
  }
}

async function executeHelp(caporal: Program, argv: string[], command?: string) {
  const helpOptions = argv.filter((arg) =>
    ['-v', '--verbose', '--quiet', '--silent', '--color'].includes(arg),
  );
  const args = ['help'];
  if (command) {
    args.push(command);
  }
  args.push('--nc', ...helpOptions);

  await caporal.run(args);
}

async function addProjectScripts(
  caporal: Program,
  scriptsIndexModule: string,
): Promise<Set<string>> {
  const scriptsNames: Set<string> = new Set();

  if (scriptsIndexModule) {
    const scriptsModule = await import(scriptsIndexModule);
    for (const scriptClass of Object.values(scriptsModule)) {
      const script: ScriptBase = new (scriptClass as IScriptConstructor)(null as any);
      if (await registerScript(caporal, script)) {
        scriptsNames.add(script.name);
      }
    }
  }

  return scriptsNames;
}

/**
 * Register a Script on Caporal.
 *
 * @returns `true` is the script has been registered or
 *  `false` if it was skipped.
 */
async function registerScript(caporal: Program, script: ScriptBase): Promise<boolean> {
  if (
    (script instanceof ScriptBase && !script.name.startsWith(TESTING_SCRIPT_NAME_PREFIX)) ||
    globalConstants.testingMode
  ) {
    await script.registerScript(caporal);
    return true;
  }
  return false;
}
