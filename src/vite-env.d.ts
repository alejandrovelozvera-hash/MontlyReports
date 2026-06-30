/// <reference types="vite/client" />

declare global {
  interface ElectronAPI {
    getClients: () => Promise<Client[]>
    createClient: (data: CreateClientInput) => Promise<Client>
    updateClient: (id: string, data: Partial<CreateClientInput>) => Promise<Client>
    deleteClient: (id: string) => Promise<void>
    uploadLogo: (clientId: string, filePath: string) => Promise<Client>
    removeLogo: (clientId: string) => Promise<Client>

    getDesigns: (clientId: string, month?: number, year?: number) => Promise<Design[]>
    getDesignsByMonth: (clientId: string, month: number, year: number) => Promise<Design[]>
    createDesign: (data: CreateDesignInput) => Promise<Design>
    toggleDesignPaid: (id: string) => Promise<boolean>
    deleteDesign: (id: string) => Promise<void>
    updateDesign: (id: string, data: Partial<UpdateDesignInput>) => Promise<Design>
    batchReorder: (items: { id: string; sortOrder: number }[]) => Promise<void>

    generateReport: (params: { clientId: string; month: number; year: number; message: string; color: string; template?: string; watermark?: string }) => Promise<string>
    getReports: (clientId: string) => Promise<Report[]>

    selectImage: () => Promise<string | null>
    selectImages: () => Promise<string[]>
    selectSavePath: (defaultName: string) => Promise<string | null>
    getImageUrl: (filePath: string) => string

    getAppPath: () => Promise<string>
    openFolder: (filePath: string) => Promise<void>
    openMailto: (to: string, subject: string, body: string) => Promise<void>

    backupData: () => Promise<string | null>
    restoreData: () => Promise<boolean>

    exportClientZip: (clientId: string, month: number, year: number) => Promise<string | null>

    setClientLogo: (clientId: string, filePath: string) => Promise<Client>

    getSetting: (key: string) => Promise<string | null>
    setSetting: (key: string, value: string) => Promise<void>

    downloadImageFromUrl: (url: string) => Promise<string>
    searchDesigns: (query: string) => Promise<(Design & { client_name: string })[]>
    exportDesignImage: (designId: string) => Promise<string | null>
    toggleFavorite: (designId: string) => Promise<Design>
    exportGalleryHtml: (clientId: string, month: number, year: number) => Promise<string>
    exportClientData: (clientId: string) => Promise<string | null>

    notify: (title: string, body: string) => Promise<void>
    generateProforma: (data: any) => Promise<string | null>
    winMinimize: () => void
    winMaximize: () => void
    winClose: () => void
    winIsMaximized: () => Promise<boolean>

    setCompanyLogo: (filePath: string) => Promise<string>
    listProducts: () => Promise<Product[]>
    createProduct: (data: {name:string;category:string;price:number}) => Promise<Product>
    updateProduct: (id: string, data: {name?:string;category?:string;price?:number}) => Promise<Product>
    deleteProduct: (id: string) => Promise<boolean>
      uploadProformaTemplate: () => Promise<{path:string;previewPath:string;exists:boolean;warning?:string}|null>
    getProformaTemplate: () => Promise<{path:string|null;previewPath:string|null;exists:boolean}>
    removeProformaTemplate: () => Promise<{exists:boolean}>

    // Supabase migration
    runMigration: (url: string, anonKey: string) => Promise<string[]>
    saveMigrationConfig: (url: string, anonKey: string) => Promise<void>
    getMigrationConfig: () => Promise<{ supabaseUrl: string; supabaseAnonKey: string }>
    setSupabaseMode: (enabled: boolean) => Promise<void>
    getSupabaseMode: () => Promise<boolean>
    uploadPendingFiles: () => Promise<string[]>
    replaceDesignImage: (id: string, filePath: string) => Promise<Design>
  }

  interface Client {
    id: string
    name: string
    email: string
    company: string
    color: string
    notes: string
    logo_path: string
    created_at: string
    status: string
  }

  interface Design {
    id: string
    client_id: string
    title: string
    description: string
    category: string
    sort_order: number
    file_name: string
    file_path: string
    thumbnail_path: string
    design_date: string
    created_at: string
    notes: string
    favorite: number
    price: number
    paid: number
    platform: string
    platform_cost: number
  }

  interface Report {
    id: string
    client_id: string
    month: number
    year: number
    personal_message: string
    template_color: string
    file_path: string
    created_at: string
  }

  interface MonthlyStat {
    month: number
    year: number
    count: number
  }

  interface CreateClientInput {
    name: string
    email?: string
    company?: string
    color?: string
    notes?: string
  }

  interface CreateDesignInput {
    clientId: string
    title: string
    description?: string
    category?: string
    sortOrder?: number
    filePath: string
    fileName: string
    designDate: string
    price?: number
    platform?: string
    platform_cost?: number
  }

  interface UpdateDesignInput {
    title?: string
    description?: string
    category?: string
    sort_order?: number
    notes?: string
    favorite?: number
    price?: number
    platform?: string
    platform_cost?: number
  }

  interface DesignTemplate { id: string; name: string; category: string; price: number; created_at: string }
  interface ClientNote { id: string; client_id: string; note: string; created_at: string }
  interface MonthlyGoal { id: string; month: number; year: number; goal: number }

  interface Product {
    id: string
    name: string
    category: string
    price: number
    created_at: string
  }

  interface PackageItem {
    id: string
    package_id: string
    description: string
    category: string
    quantity: number
    price: number
  }

  interface Package {
    id: string
    name: string
    description: string
    created_at: string
    items: PackageItem[]
  }

  interface Window {
    electronAPI: ElectronAPI & {
      listTemplates: () => Promise<DesignTemplate[]>
      createTemplate: (data: {name:string;category:string;price:number}) => Promise<DesignTemplate>
      deleteTemplate: (id: string) => Promise<boolean>
      getTags: (designId: string) => Promise<string[]>
      setTags: (designId: string, tags: string[]) => Promise<boolean>
      getAllTags: () => Promise<string[]>
      listClientNotes: (clientId: string) => Promise<ClientNote[]>
      addClientNote: (clientId: string, note: string) => Promise<ClientNote>
      deleteClientNote: (id: string) => Promise<boolean>
      getGoal: (month: number, year: number) => Promise<MonthlyGoal|null>
      setGoal: (month: number, year: number, goal: number) => Promise<MonthlyGoal>
      setClientStatus: (id: string, status: string) => Promise<Client>
      generateProforma: (data: any) => Promise<string|null>
      notify: (title: string, body: string) => Promise<void>
      winMinimize: () => void
      winMaximize: () => void
      winClose: () => void
      winIsMaximized: () => Promise<boolean>
      listProducts: () => Promise<Product[]>
      createProduct: (data: {name:string;category:string;price:number}) => Promise<Product>
      updateProduct: (id: string, data: {name?:string;category?:string;price?:number}) => Promise<Product>
      deleteProduct: (id: string) => Promise<boolean>
      setCompanyLogo: (filePath: string) => Promise<string>
      listPackages: () => Promise<Package[]>
      createPackage: (data: { name: string; description: string; items: { description: string; category: string; quantity: number; price: number }[] }) => Promise<Package>
      updatePackage: (id: string, data: { name?: string; description?: string; items?: { description: string; category: string; quantity: number; price: number }[] }) => Promise<Package>
      deletePackage: (id: string) => Promise<boolean>
    uploadProformaTemplate: () => Promise<{path:string;previewPath:string;exists:boolean;warning?:string}|null>
      getProformaTemplate: () => Promise<{path:string|null;previewPath:string|null;exists:boolean}>
      removeProformaTemplate: () => Promise<{exists:boolean}>
    }
  }
}

export {}