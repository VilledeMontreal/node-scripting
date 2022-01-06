/* eslint-disable @typescript-eslint/ban-types */
import { ParsedArgumentsObject } from '@caporal/core';
import { CoreScriptBase } from './coreScriptBase';
import { IGlobalOptions } from './globalOptions';

/**
 * Base class for core script related to linting.
 */
export abstract class CoreLintScriptBase<
  O = {},
  GO extends IGlobalOptions = IGlobalOptions,
  A extends ParsedArgumentsObject = {}
> extends CoreScriptBase<O, GO, A> {
  protected get requiredDependencies(): string[] {
    return ['@villedemontreal/lint-config'];
  }
}
