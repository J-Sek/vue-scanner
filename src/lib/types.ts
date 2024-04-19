export type FolderScanItem =
  | {
      isVue: false;
      name: string;
      isDirectory: boolean;
      migrationComplexity?: number;
      vuetifyComponents?: string[];
    }
  | (ScanItem & {
      isVue: true;
      isDirectory: false;
    });

export type ScanItem = {
  path: string;
  name: string;
  localDependencies: string[];
  otherDependencies: string[];
  localImports: string[];
  vuetifyComponents: string[];
  vuetifyDirectives: string[];

  allLocalDependencies?: string[];
  allOtherDependencies?: string[];
  allVuetifyComponents?: string[];
  allVuetifyDirectives?: string[];

  migrationComplexity?: number;
  migrationValue?: number;
};

export type ScanItemEntry = {
  path: string;
  name: string;
  localDependencies: string;
  otherDependencies: string;
  localImports: string;
  vuetifyComponents: string;
  vuetifyDirectives: string;

  allLocalDependencies: string;
  allOtherDependencies: string;
  allVuetifyComponents: string;
  allVuetifyDirectives: string;

  migrationComplexity: number;
  migrationValue: number;
};
