# Librairie pour la création et utilisation de scripts dans un projet Node.js

Cette librairie, basée sur [Caporal](https://caporal.io/), offre une manière standardisée de créer et de lancer des scripts
localement dans un projet d'API ou dans une librairie utilisant Node.js.

Les scripts sont développés en Typescript, ce qui vous permet d'utiliser des librairies `npm`,
de déboguer avec breakpoints, etc.

Un ensemble de scripts _core_ sont fournis et sont disponibles automatiquement. Vous ajoutez dans votre projet les
scripts supplémentaires dont vous avez besoin.

Une aide est automatiquement créée (et affichable) pour les scripts et leurs options sont automatiquement validées au runtime.

**Notez** que cette librairie est conçue pour ne fonctionner que lorsque les dépendances _dev_ sont disponibles! Ce que
cela signifie, c'est que dans vos `Dockerfile`, lorsque seules les dépendances _production_ sont disponibles, vous
devrez lancer `node src/start` pour démarrer l'application et non utiliser le script `start`! De lancer `./run start`
ne fonctionnerait pas car des dépendances dev manqueraient.

Ceci apporte le bénéfice à votre application nodejs de recevoir les signaux émis par Kubernetes
quand il s'apprête à fermer un conteneur (SIGTERM), ce qui permet à l'application de faire du cleanup
avant de mourir (Voir [pod-lifecycle/pod-termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination))

## Utilisation de la librairie

### Installation

Il faut créer deux fichiers à la racine du projet:

1. `run.cmd` contenant:

```
@echo off
node "%~dp0\run" %*
```

2. `run` contenant:

```javascript
#!/usr/bin/env node
import caporal from '@caporal/core';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Here, you could add custom global options, or tweak
// the Caporal instance, if required.

// Then it is run:
const script = await import(path.join(__dirname, 'node_modules/@villedemontreal/scripting/src/run.js'));
script.run({
  caporal: caporal.default,
  projectRoot: __dirname,
  scriptsIndexModule: `./scripts/index.js`,
});
```

**Note**: si vous êtes sur Linux/Mac, vous devrez aussi lancer `chmod +x run` pour rendre exécutable le fichier `./run`.

### Configurations

Il est possible de configurer certains aspects de la librairie dans le fichier `run` du projet.

- Une fois l'instance de caporal obtenue (`const caporal`), vous pouvez la configurer. Par
  exemple, il est possible d'y ajouter des options globales customs avec `caporal.option(...)`.Mais, en règle général, vous ne devriez pas
  avoir à configurer cette instance directement.

- `scriptsIndexModule` : qui est le chemin vers l'index (le fichier Typescript) exportant les scripts custom de votre projet.
  Dans un projet d'API, ce chemin ne devrait probablement pas être changé. Notez que si votre projet ne définie pas de
  scripts custom, vous pouvez complètement enlever ce paramètre ou encore le mettre à `null`.

### Lancer un script

Un script se lance en ligne de commande avec:

- Windows : `> run [scriptName] [options]`
- Linux/Mac: `> ./run [scriptName] [options]`

Par exemple:

`> run test --jenkins`

### Obtenir de l'aide sur les scripts

- Pour obtenir la liste complète des scripts disponibles et leurs options, lancez:
  `> run`  
   ou  
   `> run help`

- Pour obtenir de l'aide sur un script en particulier, lancez:
  `> run [scriptName] --help`  
  ou  
  `> run help [scriptName]`

### Lancez un script en utilisant les configurations de tests

Un script dont le nom:

- est "`test`"
- est "`validate`"
- débute par "`test-`"
- débute par "`testing:`"

sera exécuté avec la variable d'environnement `NODE_APP_INSTANCE` automatiquement mise à `tests`. Ceci fera
en sorte que les configurations `-tests` seront utilisées.

Autrement, vous pouvez spécifier l'option globale `--testing` pour forcer cette valeur.

### Ajouter un script dans votre projet

Un script sera ajouté en général ajouté sous un répetoire "`scripts`" racine.
Notez que vous pouvez créer plusieurs niveaux de sous-répertoires.

Vous devez exporter un nouveau script dans l'_index_ de vos scripts (`scripts/index.ts`).

- Un Script doit au minimum implémenter 3 méthodes:

  - `name()`: le nom du script
  - `description()`: une description pour le script
  - `main()`: contenant le code du script

- Si votre script demande plus de configurations qu'un _nom_ et _description_,
  vous pouvez également implémenter `configure()`.

- La classe de base fournit également un `logger` vous permettant d'afficher des messages
  en respectant le niveau demandé par les arguments `--silent`, `--quiet` et `--verbose`
  pouvant être passés lors d'une commande.

Si une erreur survient dans votre script, lancez simplement une erreur régulière
(`throw new Error(...)`).

**Note**: référez-vous aux scripts core fournis par cette librairie sous `scripts/testing` comme exemples!

### Ajouter des options à un script

Pour ajouter des options ou des arguments à vos scripts:

1. Vous overridez la méthode `configure(command)` et vous utilisez l'object
   [command](https://caporal.io/guide/commands.html) fourni pour ajouter les options.
   Par exemple:

```typescript
protected async configure(command: Command): Promise<void> {
  command.option(`-p, --port <number>`, `A port number`, {
    validator: caporal.NUMBER
  });
}
```

2. Vous créez une interface `Options` au dessus de la classe de votre script et définissez les
   options dans cette interface. Par exemple:

```typescript
export interface Options {
  port?: number;
}
```

3. Vous paramétrisez la classe de base `ScriptBase` avec cette interface, comme premier argument.
   Par exemple:

```typescript
export class MyScript extends ScriptBase<Options> {
  // "this.options.port" est maintenant disponible de manière typée.
}
```

### Ajouter une option globale

Cette fonctionnalité ne devrait pas souvent être requise, mais il est possible d'ajouter une option _globale_,
en plus de celles qui sont ajoutées automatiquement par la librairie.

Pour se faire, vous

1. Éditez le fichier `run` de votre projet pour ajouter l'option globale à l'instance `caporal`.
   Par exemple:

```javascript
caporal.option("--custom", "Custom global option", {
  global: true,
});
```

2. Créez dans votre projet une interface héritant de `IGlobalOptions`. Par exemple:

```typescript
export interface IAppGlobalOptions extends IGlobalOptions {
  something?: boolean;
}
```

3. Dans vos scripts, vous paramétrisez la classe de base `ScriptBase` avec cette interface, comme deuxième
   argument. Par exemple:

```typescript
export class MyScript extends ScriptBase<Options, IAppGlobalOptions> {
  // "this.options.something" est maintenant disponible de manière typée.
}
```

### Invoquer un script dans un script

Dans un script, il est possible d'en appeller un (ou plusieurs) autre en utilisant la méthode
`this.invokeScript(...)`. Vous passez à cette méthode la classe du script à appeler ainsi que les options et
arguments à utiliser.

Notez que les options _globales_ seront automatiquement disponibles par le script appellé! Vous ne les spécifiez que si vous avez besoin d'en changer la valeur.

### Lancer une commande shell dans un script

Un utilitaire fourni `this.invokeShellCommand(...)` permet de lancer une commande shell dans un script. Par exemple:

```typescript
await this.invokeShellCommand("node", ["some/js/module", "--somearg"]);
```

Le troisième paramètre est un objet `options`. Une de ces options est `useTestsNodeAppInstance` que
vous pouvez mettre à `true` pour lancer le nouveau process avec une variable d'environnement
"`NODE_APP_INSTANCE`" égale à "`tests`" et d'ainsi faire en sorte que les configurations de tests
soient utilisées si du code de l'API est exécuté dans le process.

### Ajouter un script en mode "testing"

Pour vos tests, il est possible de spécifier un script, mais
en faisant en sorte qu'il ne soit disponible _que lorsque vos tests roulent_. Pour ce faire, vous devez
préfixer le nom du script par `TESTING_SCRIPT_NAME_PREFIX` qui est une constante exportée par le
fichier `src/scriptBase.ts` de la librairie. Par exemple:

```typescript
get name(): string {
  return `${TESTING_SCRIPT_NAME_PREFIX}myTestScript`;
}
```

### Script non listé

Pour éviter qu'un script ne se retrouve dans la documentation globale générée par
`Caporal`, vous pouvez appeller `command.hide();`, dans la méthode `configure()`
overridée:

```typescript
protected async configure(command: Command): Promise<void> {
  command.hide();
  // ...
}
```

### Scripts npm

Si désiré, vous pouvez aussi déclarer vos scripts dans le fichier `package.json` de votre projet.
Ces scripts `npm` ne seront que des indirections vers le fichier `run` bootstrappant la
librairie de scripting, en utilisant `node`. Par exemple:

```json
"scripts": {
  "test": "node run test",
  // ...
}
```

Notez que si vous utilisez `npm` pour lancer un script, et que vous avez à passer des options, il vous faudra
ajouter l'argument spécial "`--`" avant les options. Par exemple:

`> npm run test -- --nc`

Ceci est passablement plus verbeux que la méthode utilisant `run` directement:

`run test --nc`

## Développement de la librairie

### Lintage

Utilisez un éditeur (VSCode a été testé) avec ces extensions installées:

- `ESLint`
- `Prettier`

### Launch configurations

Ces "_launch configurations_" sont founies pour développer la librairie dans VSCode :

- "`Debug script`" - Lance un script en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés. Pour changer le script exécuté, vous devez modifier la
  ligne appropriée dans le fichier "`.vscode/launch.json`".

- "`Debug all tests`" - Lance tous les tests en mode debug. Vous pouvez mettre des breakpoints et
  ils seront respectés.

- "`Debug current test file`" - Lance en mode debug le fichier de tests présentement ouvert dans VSCode. Vous pouvez mettre
  des breakpoints et ils seront respectés.

- "`Debug current tests file - fast`" - Lance en mode debug le fichier de tests présentement ouvert dans VSCode. Aucune compilation n'est effectuée au préalable. Cette _launch configuration_ doit être utilisée lorsque la compilation incrémentale roule (en lançant au préalable `run watch` dans un terminal).

### Test et publication de la librairie sur Nexus

En mergant une pull request dans la branche `develop`, un artifact "`-pre.build`" sera créé automatiquement dans Nexus. Vous
pouvez utiliser cette version temporaire de la librairie pour bien la tester dans un réel projet.

Une fois mergée dans `master`, la librairie est définitiement publiée dans Nexus, en utilisant la version spécifiée dans
le `package.json`.

## Artifact Nexus privé, lors du développement

Lors du développement d'une nouvelle fonctionnalité, sur une branche `feature`, il peut parfois être
utile de déployer une version temporaire de la librairie dans Nexus. Ceci permet de bien tester
l'utilisation de la librairie modifiée dans un vrai projet, ou même dans une autre librairie
elle-même par la suite utilisée dans un vrai projet.

Si le code à tester est terminé et prêt à être mis en commun avec d'autres développeurs, la solution
de base, comme spécifiée à la section précédante, est de merger sur `develop`: ceci créera
automatiquement un artifact "`-pre-build`" dans Nexus. Cependant, si le code est encore en développement
et vous désirez éviter de polluer la branche commune `develop` avec du code temporaire, il y a une
solution permettant de générer un artifact "`[votre prénom]-pre-build`" temporaire dans Nexus,
à partir d'une branche `feature` directement:

1. Checkoutez votre branche `feature` dans une branche nommée "`nexus`". Ce nom est
   important et correspond à une entrée dans le `Jenkinsfile`.
2. Une fois sur la branche `nexus`, ajoutez un suffixe "`-[votre prénom]`" à
   la version dans le `package.json`, par exemple: "`5.15.0-roger`".
   Ceci permet d'éviter tout conflit dans Nexus et exprime clairement qu'il
   s'agit d'une version temporaire pour votre développement privé.
3. Commitez et poussez la branche `nexus`.
4. Une fois le build Jenkins terminé, un artifact pour votre version aura été
   déployé dans Nexus.

**Notez** que, lors du développement dans une branche `feature`, l'utilisation d'un simple
`npm link` local peut souvent être suffisant! Mais cette solution a ses limites, par exemple si
vous désirez tester la librairie modifiée _dans un container Docker_.

## Aide / Contributions

Pour obtenir de l'aide avec ce gabarit, vous pouvez poster sur la salle Google Chat [dev-discussions](https://chat.google.com/room/AAAASmiQveI).

Notez que les contributions sous forme de pull requests sont bienvenues.
