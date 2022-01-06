import { configs } from '../config/configs';
import { CoreLintScriptBase } from '../coreLintScriptBase';

export class TsLintScript extends CoreLintScriptBase {
  get name(): string {
    return 'tslint';
  }

  get description(): string {
    return `Validate that the project respect the TSLint rules.`;
  }

  protected async main() {
    const { eslintCheck, ProjectType } = require(`${configs.projectRoot}/node_modules/@villedemontreal/lint-config`);
    await eslintCheck(configs.projectRoot, ProjectType.NODE);
  }
}
