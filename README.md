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

## Railway

Para desplegar la app funcionando de verdad en Railway, el mismo servicio puede servir el frontend y actuar como proxy para `/api/bcra`.

```bash
railway up
```

Railway usará:

- `npm run build`
- `npm run start`

En ese escenario no hace falta definir `VITE_BCRA_API_BASE`, porque la app consume el proxy local `/api/bcra`.

## Configuración

En producción, por defecto el frontend consulta `https://api.bcra.gob.ar`.

Si más adelante necesitás pasar por un proxy o backend propio:

```bash
VITE_BCRA_API_BASE=https://tu-host
```

## Notas

- La API oficial del BCRA para Central de Deudores fue publicada el 23 de septiembre de 2024.
- La documentación pública expone `https://api.bcra.gob.ar` como servidor para `Central de Deudores v1.0`.
- En GitHub Pages, el navegador no siempre puede consultar directo al BCRA. Para una versión pública operativa conviene agregar un proxy serverless o backend intermedio y configurar `VITE_BCRA_API_BASE` con esa URL.
