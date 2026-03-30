declare module '@onflow/fcl';
declare module '@onflow/types';
declare module '@onflow/fcl' {
  export function config(opts?: Record<string, any>): any;
  export function authenticate(): Promise<any>;
  export function unauthenticate(): void;
  export function currentUser(): any;
  export function mutate(opts: any): Promise<string>;
  export function query(opts: any): Promise<any>;
  export function tx(txId: string): any;
  export const authz: any;
}
declare module '@onflow/sdk' {
  export function build(args: any[]): any;
  export function resolve(ix: any): Promise<any>;
  export function send(ix: any): Promise<any>;
}
