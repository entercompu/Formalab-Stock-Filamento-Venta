# FormaLab 3D · Configuración segura

## 1. Crear la planilla

1. Creá una planilla nueva en Google Sheets.
2. Poné como nombre `FormaLab - Filamento (datos)`.
3. Entrá en **Extensiones → Apps Script**.
4. Borrá el código inicial y pegá `apps-script/Code.gs`.
5. Guardá el proyecto.

## 2. Generar la clave administrativa

1. En el selector de funciones del editor elegí `generarClaveAdmin`.
2. Presioná **Ejecutar**.
3. Autorizá los permisos solicitados.
4. Abrí el **Registro de ejecución** y copiá el texto que aparece después de `CLAVE ADMINISTRATIVA:`.
5. Guardá esa clave en un lugar seguro. No la agregues a GitHub ni a `config.js`.

## 3. Publicar Apps Script

1. Entrá en **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquier usuario**.
5. Implementá y copiá la URL terminada en `/exec`.

## 4. Configurar el frontend

Abrí `js/config.js` y reemplazá:

```js
const SCRIPT_URL = "PEGA_ACA_TU_URL_DE_APPS_SCRIPT";
```

por la URL `/exec` de Apps Script. La clave administrativa no va en este archivo.

## 5. Estructura que debe quedar en GitHub

```text
index.html
public.html
css/
  style.css
  public.css
js/
  config.js
  app.js
  public.js
apps-script/
  Code.gs
CONFIGURACION.md
```

## 6. Activar GitHub Pages

1. Repositorio → **Settings → Pages**.
2. Source: **Deploy from a branch**.
3. Branch: `main`.
4. Folder: `/ (root)`.
5. Guardá.

Al abrir `index.html`, la app pedirá la clave administrativa. Quedará guardada solamente en ese navegador. Para cambiarla usá el botón **Cambiar clave**.

El catálogo para clientes estará en:

```text
https://TU_USUARIO.github.io/TU_REPOSITORIO/public.html
```

## 7. Prueba recomendada

1. Abrí la administración e ingresá la clave.
2. Registrá un ingreso de 2 unidades.
3. Registrá una venta de 1 unidad.
4. Comprobá que el stock disponible sea 1.
5. Configurá un precio y abrí `public.html`.
6. Probá vender más unidades que las disponibles: la app debe rechazar la operación.

## Al modificar Code.gs

Usá **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**. No hace falta cambiar la URL `/exec`.
