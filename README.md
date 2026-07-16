# FormaLab 3D · Control de Filamento

App simple para registrar **ingresos** de filamento (proveedor, N° de remito, fecha) y **ventas**, y ver el stock disponible calculado automáticamente. Los datos se guardan en una planilla de Google Sheets — vos podés abrirla y revisarla en cualquier momento.

No hace falta pagar hosting ni base de datos: todo corre gratis con Google Apps Script + GitHub Pages.

## Paso 1 — Crear la planilla y el backend (Google Apps Script)

1. Andá a [sheets.google.com](https://sheets.google.com) y creá una planilla nueva. Llamala, por ejemplo, `FormaLab - Filamento (datos)`.
2. En el menú, andá a **Extensiones → Apps Script**.
3. Se abre un editor con un archivo `Code.gs` vacío. Borrá todo el contenido y pegá el contenido completo del archivo [`apps-script/Code.gs`](apps-script/Code.gs) de esta carpeta.
4. Guardá (ícono de disco o Ctrl+S).
5. Arriba a la derecha, hacé clic en **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo (tu cuenta)**.
   - Quién tiene acceso: **Cualquier usuario**.
6. Hacé clic en **Implementar**. Google te va a pedir autorizar permisos (es tu propio script, es seguro) — aceptá.
7. Copiá la **URL de la aplicación web** que te muestra. Termina en `/exec`. La vas a necesitar en el paso 3.

> La primera vez que uses la app, el script crea automáticamente las pestañas "Ingresos" y "Ventas" dentro de la planilla, con los encabezados correspondientes.

## Paso 2 — Subir el frontend a GitHub

1. Creá un repositorio nuevo en GitHub (público o privado, ambos funcionan con GitHub Pages; si es privado necesitás plan que lo permita).
2. Subí **todos los archivos de esta carpeta** (`index.html`, `css/`, `js/`) a la raíz del repositorio. Podés arrastrar los archivos desde la web de GitHub ("Add file → Upload files") o con git:
   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

## Paso 3 — Conectar el frontend con tu planilla

1. Abrí el archivo `js/config.js` en GitHub (o en tu compu antes de subirlo).
2. Reemplazá el texto `PEGA_ACA_TU_URL_DE_APPS_SCRIPT` por la URL que copiaste en el Paso 1.
3. Guardá los cambios (si lo editás en GitHub directamente, hacé "Commit changes").

## Paso 4 — Activar GitHub Pages (verlo online)

1. En tu repositorio, andá a **Settings → Pages**.
2. En "Source", elegí la rama `main` y la carpeta `/ (root)`.
3. Guardá. En un minuto te va a dar una URL tipo:
   `https://TU_USUARIO.github.io/TU_REPO/`
4. Esa es la dirección de tu app — funciona desde el celu, la notebook, donde sea.

## Pedidos por WhatsApp desde el catálogo

En `public.html`, tus clientes ahora pueden:
1. Sumar cantidades de cada color con los botones **+ / −** (respeta el stock disponible, no los deja pedir más de lo que hay).
2. Ver un resumen flotante abajo con el total de productos y el precio estimado.
3. Tocar **"Ver pedido"**, poner su nombre y notas opcionales, y **"Enviar pedido por WhatsApp"** — se abre WhatsApp con un mensaje ya redactado con el detalle del pedido, listo para enviarte.

**Para activarlo**, en `js/config.js` reemplazá:
```js
const WHATSAPP_NUMBER = "PEGA_TU_NUMERO_DE_WHATSAPP";
```
por tu número con código de país, sin espacios ni el signo `+`. Ejemplo para Argentina:
```js
const WHATSAPP_NUMBER = "5492966123456";
```

El pedido no se guarda solo ni descuenta stock automáticamente — llega como mensaje de WhatsApp para que vos lo confirmes y después cargues la venta real en el panel de administración (`Nueva venta`), así el stock queda siempre exacto.

## Tu logo

La app busca tu logo en `img/logo.png`. Para ponerlo:

1. Preparalo como imagen cuadrada (por ejemplo 128×128 o 256×256 px), formato `.png`.
2. Llamalo **exactamente** `logo.png`, todo en minúsculas — GitHub Pages distingue mayúsculas de minúsculas, así que `Logo.PNG` o `logo.jpg` no van a funcionar con la configuración actual.
3. En tu repositorio de GitHub, creá la carpeta `img` (Add file → Create new file, escribí `img/logo.png` como nombre y ahí te da la opción de subir el archivo en su lugar) o subilo directo arrastrándolo dentro de la carpeta `img`.
4. Si el archivo no aparece o el nombre no coincide, la app no se rompe: automáticamente muestra el logo de texto "FL3D" como respaldo.

## Cómo se usa

- **Nuevo ingreso**: cuando te llega filamento del proveedor, cargás fecha, proveedor, N° de remito, marca, tipo, color, cantidad y costo. Queda en el historial para siempre.
- **Nueva venta**: antes de entregar un pedido, cargás qué vendiste. El precio ya viene precargado en $24.000 pero lo podés cambiar.
- **Precios**: definís el precio de lista por color. Es el precio que ven tus clientes en el catálogo público (independiente del precio que cargás en cada venta puntual).
- **Stock actual**: se calcula solo (ingresado − vendido) y te avisa qué colores están bajos o sin stock.
- **Historial**: todos los ingresos y ventas, más recientes primero.

## Catálogo público para clientes

El archivo `public.html` es una página separada, sin menú ni formularios, pensada para compartir con tus clientes. Muestra únicamente:
- Marca, tipo y color
- Precio de lista (el que cargaste en la sección "Precios")
- Si hay stock disponible, pocas unidades, o sin stock

No expone remitos, proveedores, costos ni ningún dato de ingresos/ventas — el backend (`action=publico`) filtra esa información antes de enviarla, así que aunque alguien mire el código no puede acceder a esos datos por ahí.

**Importante sobre privacidad**: una vez que subís esto a GitHub Pages, `public.html` queda visible para cualquiera que tenga el link — no pide usuario ni contraseña. Está pensado así a propósito (para que sea fácil de compartir), pero no debe ser el único lugar donde esté `index.html` si te preocupa que un cliente entre justo ahí: `index.html` (el panel donde cargás ingresos y ventas) también queda accesible para quien conozca la URL exacta, aunque no aparezca linkeado desde ningún lado. Si querés que el panel de administración quede protegido con contraseña, decime y te lo agrego.

Dentro del panel (`index.html → Precios`) vas a ver el link exacto a tu catálogo público, listo para copiar y mandar por WhatsApp o poner en tu bio de Instagram.

## Si algo no conecta

- Revisá que la URL en `js/config.js` termine en `/exec` (no `/dev`).
- La implementación de Apps Script tiene que tener acceso "Cualquier usuario".
- Si modificás el código de `Code.gs`, tenés que hacer **Implementar → Administrar implementaciones → editar (lápiz) → Nueva versión** para que los cambios se apliquen a la URL ya publicada.

## Actualizar la app más adelante

Si querés que te agregue: login con contraseña, gráficos de ventas por mes, alertas automáticas por WhatsApp/email cuando un color se queda sin stock, o exportar a PDF — pedímelo y lo sumamos sobre esta misma base.
