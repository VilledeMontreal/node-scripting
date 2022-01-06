/* eslint-disable @typescript-eslint/require-await */
import { Command } from '@caporal/core';
import { utils } from '@villedemontreal/general-utils';
import * as _ from 'lodash';
import * as path from 'path';
import { configs } from '../config/configs';
import { CoreScriptBase } from '../coreScriptBase';
const notifier = require('node-notifier');

export interface Options {
  /**
   * Disable the visual notification
   */
  dn?: boolean;
}

export class WatchScript extends CoreScriptBase<Options> {
  get name(): string {
    return 'watch';
  }

  get description(): string {
    return `Start Typescript incremental compilation. \
You can run this script in an external terminal and then debug your \
application in your IDE. When you have made some modifications and want \
to test them, you stop your application and restart it \
using the "Debug Locally - fast" launch configuration (if you are \
in VSCode) or \`run start --nc\`. No compilation is required at \
that point since the incremental compilation is already done by this script.`;
  }

  protected async configure(command: Command): Promise<void> {
    command.option(`--dn`, `Disable the visual notifications`);
  }

  protected async main() {
    this.logger.info(
      `\n==========================================\n` +
        `Starting incremental compilation...\n` +
        `==========================================\n`
    );
    const projectName = require(configs.projectRoot + '/package.json').name;
    let ignoreNextCompilationComplete = false;
    const compilationCompletetRegEx = /(Compilation complete)|(Found 0 errors)/;
    const errorRegEx = /(: error)|(error)/;

    const outputHandler = (stdoutData: string, stderrData: string): void => {
      if (stdoutData) {
        const stdoutDataClean = stdoutData.toString();
        this.logger.info(stdoutDataClean);

        if (this.options.dn) {
          return;
        }

        let error = false;
        if (errorRegEx.test(stdoutDataClean)) {
          error = true;
          notifier.notify({
            title: projectName,
            message: 'incremental compilation error',
            icon: path.normalize(`${__dirname}/../../../assets/notifications/error.png`),
            sound: false
          });
        } else if (compilationCompletetRegEx.test(stdoutDataClean)) {
          if (!ignoreNextCompilationComplete) {
            notifier.notify({
              title: projectName,
              message: 'incremental compilation done',
              icon: path.normalize(`${__dirname}/../../../assets/notifications/success.png`),
              sound: false
            });
          }
        }

        ignoreNextCompilationComplete = error && !compilationCompletetRegEx.test(stdoutDataClean);
      }
      if (stderrData && !stderrData.match(/^Debugger attached.(\n|\r\n)$/)) {
        this.logger.error(stderrData);
      }
    };

    while (true) {
      try {
        await this.invokeShellCommand(
          'node',
          [
            `${configs.projectRoot}/node_modules/typescript/lib/tsc.js`,
            '--project',
            configs.projectRoot,
            '--watch',
            '--pretty'
          ],
          {
            outputHandler
          }
        );
      } catch (err) {
        // ==========================================
        // @see https://stackoverflow.com/a/25444766/843699
        // ==========================================
        if (_.isString(err) && err.indexOf('3221225786') >= 0) {
          this.logger.error('Exiting...');
          process.exit(0);
        }

        this.logger.error(`Error, restarting incremental compilation in a second : ${err}`);
        await utils.sleep(1000);
      }
    }
  }
}
