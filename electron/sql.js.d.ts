declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    getAsObject(params?: object): Record<string, any>
    free(): boolean
  }

  interface Database {
    run(sql: string, params?: any[]): Database
    prepare(sql: string): Statement
    exec(sql: string): QueryExecResult[]
    export(): Uint8Array
    close(): void
  }

  interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export type { Database }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}

declare module 'archiver' {
  import type { Writable } from 'stream'
  interface Archiver {
    pipe(w: Writable): Writable
    directory(dir: string, dest: string, opts?: { ignore?: (n: string) => boolean }): void
    finalize(): void
    on(ev: string, cb: (...args: any[]) => void): this
  }
  function archiver(format: string, opts?: any): Archiver
  export default archiver
}

declare module 'ws' {
  class WebSocket {
    constructor(url: string, protocols?: string | string[])
    close(): void
    send(data: any): void
    onopen: (() => void) | null
    onclose: ((e: any) => void) | null
    onerror: ((e: any) => void) | null
    onmessage: ((e: any) => void) | null
  }
  export default WebSocket
}
