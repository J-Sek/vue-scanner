# Vue Project Scanner

Scan and analyze pages, layouts and component in the Vuetify based project to make informed decisions about next steps when migrating to Vuetify 3.

## Run locally

1. copy `.env.example` as `.env`
1. set `PROJECT_PATH` to the directory containing components and pages subfolders
1. run with `bun run dev`

## Before first use

- **Other dependencies** refer to components from external libraries like tip-tap, vue-plyr or charts
- **Local dependencies** refer to components that were not classified as external or Vuetify

<details><summary>Calculations for migration complexity and component value</summary>

```ts
const multipliers = {
  localComponents: 5,
  otherComponents: 4,
  frameworkComponents: 3,
  frameworkDirectives: 2,

  dependentComponents: 1,
  dependentLayouts: 3,
  dependentPages: 2
};
```

```ts
migrationComplexity = 0
  + x.allLocalDependencies.length * multipliers.localComponents
  + x.allOtherDependencies.length * multipliers.otherComponents
  + x.allVuetifyComponents.length * multipliers.frameworkComponents
  + x.allVuetifyDirectives.length * multipliers.frameworkDirectives;
```

```ts
migrationValue = 0
  + dependentComponents.length * multipliers.dependentComponents
  + allDependentLayouts.length * multipliers.dependentLayouts;
  + allDependentPages.length * multipliers.dependentPages;
```

</details>

## Endpoints

Open [/full-scan](http://localhost:8600/full-scan) to execute full scan.

Open [/explore](http://localhost:8600/explore) to navigate folders and see migration complexity values.

Open [/reports/components](http://localhost:8600/reports/components) to see components sorted by migration value (based on its usage).
