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
