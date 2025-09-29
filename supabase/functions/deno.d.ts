// Déclare l’objet global `Deno` pour l’autocomplétion dans VSCode
declare const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
  