/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/ban-types */
import {
  ActionParameters,
  chalk,
  Command,
  CommandConfig,
  Logger,
  ParsedArgumentsObject,
  ParsedOptions,
  Program
} from '@caporal/core';
import { globalConstants, utils } from '@villedemontreal/general-utils';
import { StdioOptions } from 'child_process';
import * as _ from 'lodash';
import { configs } from './config/configs';
import { IGlobalOptions } from './globalOptions';

/**
 * A script with a name starting with this prefix
 * will only be registered on Caporal when tests
 * are running (ie: when the NODE_APP_INSTANCE env
 * var is "tests").
 */
export const TESTING_SCRIPT_NAME_PREFIX = 'testing:';

/**
 * Constructor definition of a Script class
 */
export type IScriptConstructor<
  O = {},
  GO extends IGlobalOptions = IGlobalOptions,
  A extends ParsedArgumentsObject = {}
> = new (actionParams: ActionParameters) => ScriptBase<O, GO, A>;

let projectDirectDependencies: string[];

/**
 * Base class for a Script.
 *
 * You can parametrize it so `this.options` and `this.args`
 * are typed.
 */
export abstract class ScriptBase<
  O = {},
  GO extends IGlobalOptions = IGlobalOptions,
  A extends ParsedArgumentsObject = {}
> {
  private _actionParams: ActionParameters;

  constructor(actionParams: ActionParameters) {
    this._actionParams = actionParams;
  }

  /**
   * Will be used to identify the script
   * when outputing console messages.
   */
  get outputName(): string {
    return this.name;
  }

  get commandConfig(): Partial<CommandConfig> {
    return {}; // nothing by default
  }

  protected get actionParams(): ActionParameters {
    if (!this._actionParams) {
      throw new Error(`No actions parameters specified!`);
    }
    return this._actionParams;
  }

  /**
   * Dependencies required for the script to run properly.
   */
  protected get requiredDependencies(): string[] {
    return [];
  }

  /**
   * The script's arguments.
   */
  protected get args(): A {
    return (this.actionParams.args || {}) as A;
  }

  /**
   * The script's options.
   */
  protected get options(): O & GO {
    return ((this.actionParams.options as unknown as O) || {}) as O & GO;
  }

  /**
   * The script's logger. Will respect any specified log
   * level (for example if the script was called with `--silent`).
   */
  protected get logger(): Logger {
    return this.actionParams.logger;
  }

  /**
   * The description of the script.
   */
  abstract get description(): string;

  /**
   * The name of the script.
   */
  abstract get name(): string;

  /**
   * Register the script on Caporal
   */
  public async registerScript(caporal: Program): Promise<void> {
    const command = caporal.command(this.name, this.description + '\n', this.commandConfig);
    await this.addAction(command);
    await this.addHelpBody(command);
    await this.configure(command);
  }

  /**
   * Runs the script.
   */
  public async run(): Promise<void> {
    const start = new Date();
    this.logger.info(`Script "${chalk.cyanBright(this.outputName)}" starting...`);

    await this.validateRequiredDependencies();

    try {
      await this.main();
    } catch (originalError) {
      const err = typeof originalError === 'string' ? new Error(originalError) : originalError;
      if (err.__reported) {
        this.logger.warn(
          `Script "${chalk.cyanBright(this.outputName)}" was aborted after ${chalk.magenta(
            calcElapsedTime(start, new Date())
          )}`
        );
      } else {
        this.logger.error(
          `Script "${chalk.cyanBright(this.outputName)}" failed after ${chalk.magenta(
            calcElapsedTime(start, new Date())
          )} with: ${chalk.red(err.message)}`
        );
        err.__reported = true;
      }
      throw err;
    }

    this.logger.info(
      `Script "${chalk.cyanBright(this.outputName)}" successful after ${chalk.magenta(
        calcElapsedTime(start, new Date())
      )}`
    );
  }
  protected async addAction(command: Command): Promise<void> {
    command.action(async (params: ActionParameters) => {
      const script: ScriptBase = new (this as any).constructor(params);
      await script.run();
    });
  }

  protected async addHelpBody(command: Command): Promise<void> {
    command.help(this.description); // only the description by default
  }

  /**
   * WARNING: The code in this method only makes sense *when launching
   * a new process*! Using this to run code in the current process
   * will not result in the proper configs to be used since configs
   * are already loaded.
   *
   * Instead of using this method, you should probably use `invokeShellCommand()`
   * with the `useTestsNodeAppInstance` param set to `true`.
   */
  protected async withTestsNodeAppInstance<T = void>(runner: () => Promise<T>): Promise<T> {
    const nodeAppInstanceOriginal = process.env[globalConstants.envVariables.NODE_APP_INSTANCE];
    process.env[globalConstants.envVariables.NODE_APP_INSTANCE] = globalConstants.appInstances.TESTS;
    try {
      return await runner();
    } finally {
      if (nodeAppInstanceOriginal) {
        process.env[globalConstants.envVariables.NODE_APP_INSTANCE] = nodeAppInstanceOriginal;
      } else {
        delete process.env[globalConstants.envVariables.NODE_APP_INSTANCE];
      }
    }
  }

  /**
   * Invokes the specified script.
   *
   * @param scriptType the class of a Script to invoke
   * @param options specify the target options for the script to invoke. Those options
   *   will be *merged* to the current global options, if any.
   * @param args specify the target args for the script to invoke
   */
  protected async invokeScript<TOptions, TArgs extends ParsedArgumentsObject>(
    scriptType: IScriptConstructor<TOptions, GO, TArgs>,
    options: TOptions,
    args: TArgs
  ) {
    const allOptions = this.addGlobalOptions<TOptions>(options);

    const actionParams: ActionParameters = {
      ...this.actionParams,
      options: allOptions as unknown as ParsedOptions,
      args
    };
    const script = new scriptType(actionParams);
    return await script.run();
  }

  /**
   * Execute a shell command.
   *
   * This function is a promisified version of Node's `spawn()`
   * with extra options added
   * ( https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options ).
   *
   * Will fail if the process returns a code different than
   * `options.successExitCode` ("0" by default). The exit
   * code would then be available in the generated Error:
   * `err.exitCode`.
   *
   * @param bin The executable program to call.
   *
   * @param args The arguments for the program.
   *
   * @param options.successExitCodes The acceptable codes the
   *   process must exit with to be considered as a success.
   *   Defaults to [0].
   *
   * @param options.outputHandler A function that will receive
   *   the output of the process (stdOut and stdErr).
   *   This allows you to capture this output and manipulate it.
   *   No handler by default.
   *
   * @param options.disableConsoleOutputs Set to `true` in order
   *   to disable outputs in the current parent process
   *   (you can still capture them using a `options.dataHandler`).
   *   Defaults to `false`.
   *
   * @param options.stdio See https://nodejs.org/api/child_process.html#child_process_options_stdio
   *   Defaults to `['inherit', 'pipe', 'pipe']`.
   *
   * @param options.useShellOption See the "shell" option:
   *   https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
   *   Defaults to `true`.
   *
   * @param options.useTestsNodeAppInstance Execute the specified command with the
   *   "NODE_APP_INSTANCE" env var set to "tests". This makes the testing configurations
   *   be used in the launched process.
   *
   * @returns The exit code *when the execution is a success*. This may be useful when more
   *   than one exit codes can be considered as a success (those specified using
   *   `options.successExitCodes`). Note that if an error occures, an `ExecError` is thrown
   *   so nothing is returned (see below).
   *
   * @throws Will fail with a `ExecError` error if the process returns a code different than
   *   `options.successExitCodes` ("0" by default). The exit code would then be available in the
   *   generated Error: `err.exitCode.`
   */
  protected async invokeShellCommand(
    bin: string,
    args: string[],
    options?: {
      successExitCodes?: number | number[];
      outputHandler?: (stdoutOutput: string, stderrOutput: string) => void;
      disableConsoleOutputs?: boolean;
      stdio?: StdioOptions;
      useShellOption?: boolean;
      useTestsNodeAppInstance?: boolean;
    }
  ): Promise<number> {
    const useTestsNodeAppInstance = options?.useTestsNodeAppInstance ?? false;
    const execOptions = options;
    delete execOptions?.useTestsNodeAppInstance;

    this.logger.info(`Executing: ${bin} ${args}`);

    if (useTestsNodeAppInstance) {
      return await this.withTestsNodeAppInstance<number>(async () => {
        return await utils.exec(bin, args, execOptions);
      });
    }

    return await utils.exec(bin, args, execOptions);
  }

  protected getCommand() {
    const command = configs.caporal.getCommands().find(c => c.name === this.name);
    return command;
  }

  protected getCommandOptionsNames() {
    const optionsNames: Set<string> = new Set();

    const command = this.getCommand();
    if (command) {
      for (const option of command.options) {
        option.allNames.forEach(name => optionsNames.add(name));
      }
    }

    return optionsNames;
  }

  /**
   * Override this method in order to add
   * options or to configure a script that
   * requires more information than a name and
   * description.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async configure(command: Command): Promise<void> {
    // nothing by default
  }

  /**
   * Get the project direct dependencies (those
   * explicitly listed in its `package.json`).
   */
  protected async getProjectDirectDependencies() {
    if (!projectDirectDependencies) {
      const packageJsonObj = require(`${configs.projectRoot}/package.json`);
      projectDirectDependencies = [
        ...Object.keys(packageJsonObj.dependencies),
        ...Object.keys(packageJsonObj.devDependencies)
      ];
    }
    return projectDirectDependencies;
  }

  /**
   * Returns `true` if the specified dependency is a
   * direct dependency in the project.
   */
  protected async isProjectDirectDependency(dependencyName: string) {
    return (await this.getProjectDirectDependencies()).includes(dependencyName);
  }

  /**
   * Validate the required dependencies.
   */
  protected async validateRequiredDependencies() {
    const requiredDeps = this.requiredDependencies;
    const projectDeps = await this.getProjectDirectDependencies();

    const missingDirectDeps = _.difference(requiredDeps, projectDeps);
    if (missingDirectDeps && missingDirectDeps.length > 0) {
      this.logger.warn(`This script requires some dependencies that are not direct dependencies in your project:`);
      for (const missingDep of missingDirectDeps) {
        this.logger.warn(`- ${missingDep}`);
      }
      this.logger.warn(
        `The script may still work if those dependencies are available ${chalk.italic(
          'transitively'
        )}, but it may be a good idea to add them directly to your "${chalk.cyanBright('package.json')}" file.`
      );
    }
  }

  private addGlobalOptions<t>(options: t | GO) {
    const currentGlobalOptions = {};

    const commandOptionsnames = this.getCommandOptionsNames();
    for (const [key, val] of Object.entries(this.options)) {
      if (!commandOptionsnames.has(key)) {
        currentGlobalOptions[key] = val;
      }
    }

    return {
      ...currentGlobalOptions,
      ...options
    };
  }

  /**
   * The main code to execute when the
   * script is called.
   */
  protected abstract main(): Promise<void>;
}

function calcElapsedTime(from: Date, to: Date) {
  const deltaSecs = Math.round(10 * ((to.getTime() - from.getTime()) / 1000.0)) / 10;
  const deltaMinutes = Math.round(10 * (deltaSecs / 60.0)) / 10;
  const deltaText = deltaSecs > 120 ? `${deltaMinutes} m` : `${deltaSecs} s`;
  return deltaText;
}
