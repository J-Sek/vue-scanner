export type FolderScanItem =
  | {
      isVue: false;
      name: string;
      isDirectory: boolean;
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
};

export type ScanItemEntry = {
  path: string;
  name: string;
  localDependencies: string;
  otherDependencies: string;
  localImports: string;
  vuetifyComponents: string;
  vuetifyDirectives: string;
};
