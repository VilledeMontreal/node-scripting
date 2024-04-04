import path from 'path';
import { configs } from '../src/config/configs.js';
import { ScriptBase } from '../src/index.js';

export class LintScript extends ScriptBase {
  get name(): string {
    return 'lint';
  }

  get description(): string {
    return `Run the ESLint validation (including TSLint and Prettier rules).`;
  }

  protected async main() {
    await this.invokeShellCommand(path.join(configs.libRoot, 'node_modules/.bin/eslint'), [configs.libRoot]);
  }
}
