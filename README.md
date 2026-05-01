# Consultas BCRA PWA

Base inicial para una PWA mobile-first enfocada en consultas a la API oficial del BCRA, empezando por Central de Deudores.

## Qué incluye

- React + TypeScript + Vite
- manifest y service worker para instalación básica
- cliente para:
  - `/centraldedeudores/v1.0/Deudas/{Identificacion}`
  - `/centraldedeudores/v1.0/Deudas/Historicas/{Identificacion}`
  - `/centraldedeudores/v1.0/Deudas/ChequesRechazados/{Identificacion}`
- interfaz pensada para teléfono con pestañas para deuda actual, histórica y cheques
- almacenamiento local de consultas recientes

## Desarrollo

```bash
npm install
npm run dev
```

En desarrollo, Vite usa un proxy local en `/api/bcra` para evitar problemas de CORS del navegador contra `api.bcra.gob.ar`.

## Build

```bash
npm run build
```

## Configuración

En producción, por defecto el frontend consulta `https://api.bcra.gob.ar`.

Si más adelante necesitás pasar por un proxy o backend propio:

```bash
VITE_BCRA_API_BASE=https://tu-host
```

## Notas

- La API oficial del BCRA para Central de Deudores fue publicada el 23 de septiembre de 2024.
- La documentación pública expone `https://api.bcra.gob.ar` como servidor para `Central de Deudores v1.0`.
- Si el despliegue final en GitHub Pages tuviera restricciones de CORS, conviene agregar un proxy serverless y dejar este frontend igual.
