// types/deno.d.ts
declare const Deno: {
    serve: (handler: (req: Request) => Response | Promise<Response>) => void;
    env: {
      get(key: string): string | undefined;
    };
  };
  