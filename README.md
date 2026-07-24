# Monthly Design Reports

> Aplicacion de escritorio para gestionar clientes de diseno, dar seguimiento
> al trabajo mes a mes, y generar reportes, proformas y facturas en PDF.

## Por que existe

Llevar el control de multiples clientes de diseno --que se entrego, cuando,
cuanto se cobro, que falta por facturar-- a mano o en hojas de calculo sueltas
se vuelve inmanejable rapido. Monthly Design Reports centraliza todo eso en
una sola aplicacion de escritorio: clientes, trabajo entregado, estadisticas
y documentos financieros listos para enviar.

## Que hace

- **Gestion de clientes**: fichas de cliente con notas, historial de actividad y linea de tiempo
- **Carga de trabajo por lotes**: sube multiples disenos de una vez (BatchUploader), con importacion desde URL
- **Reportes visuales**: graficas de estadisticas y por categoria del trabajo realizado
- **Proformas y facturas en PDF**: generacion automatica de documentos financieros listos para el cliente
- **Modo presentacion**: vista de pantalla completa para mostrar el trabajo a un cliente
- **Plantillas reutilizables** para reportes recurrentes
- **Sincronizacion con Supabase**, con migracion desde base de datos local (sql.js)

## Stack

- **Electron** -- aplicacion de escritorio multiplataforma
- **React 18 + TypeScript** -- interfaz
- **Vite** -- build tool
- **Tailwind CSS** -- estilos
- **Zustand** -- manejo de estado
- **Supabase** -- base de datos y sincronizacion en la nube
- **sql.js** -- base de datos local embebida (con migracion a Supabase)
- **Generacion de PDF** nativa (pdf-generator.ts) para proformas y reportes

## Como correrlo localmente

```bash
git clone https://github.com/alejandrovelozvera-hash/MonthlyReports.git
cd MonthlyReports
npm install
cp .env.example .env
```

Completa `.env` con tus credenciales de Supabase (ver `.env.example` para las
variables requeridas).

```bash
npm run dev
```

Para generar el ejecutable de escritorio:

```bash
npm run build
```

## Estructura del proyecto

monthly-design-reports/
## Estructura del proyecto

<details>
<summary>Ver arbol de carpetas</summary>
monthly-design-reports/
|
|-- electron/ # Proceso principal de Electron
| |-- main.ts # Entry point del proceso Electron
| |-- preload.ts # Bridge seguro entre Electron y el renderer
| |-- db.ts # Capa de base de datos local
| |-- pdf-generator.ts # Generacion de PDFs (proformas, reportes)
| |-- migrate-to-supabase.ts # Migracion de datos locales a Supabase
| -- supabase-service.ts      # Cliente y servicios de Supabase | |-- src/                         # Aplicacion React (renderer) |   |-- components/              # 20+ componentes de UI |   |   |-- ClientForm.tsx           # Formulario de cliente |   |   |-- BatchUploader.tsx        # Carga de disenos por lotes |   |   |-- ProformaDialog.tsx       # Generacion de proformas |   |   |-- StatsChart.tsx           # Graficas de estadisticas |   |   -- ... # (formularios, dialogs, previews)
| |
| |-- pages/ # Vistas principales
| | |-- Dashboard.tsx
| | |-- Clients.tsx
| | |-- ClientDetail.tsx
| | |-- Finance.tsx
| | -- Settings.tsx |   | |   |-- store/ |   |   -- useStore.ts # Estado global (Zustand)
| |
| -- supabase/ |       |-- client.ts            # Cliente de Supabase |       |-- migrate.ts           # Migracion de esquema/datos |       -- schema.sql # Definicion de la base de datos
|
|-- vite.config.ts
|-- tailwind.config.js
`-- package.json
</details>

## Roadmap

- [ ] Exportacion automatica de reportes por correo
- [ ] Mas plantillas de reporte predisenadas
- [ ] Sincronizacion multi-dispositivo mejorada

## Estado

En uso activo, aplicacion de escritorio para gestion interna de clientes de diseno.
