CONTROL CASH — PRIMERA VERSIÓN
==================================

QUÉ INCLUYE
- Aplicación web adaptable a celular.
- Instalable como PWA cuando se publica por HTTPS.
- Registro de clientes, préstamos y cobros.
- Dos monedas separadas: DOP (RD$) y USD (US$). No convierte ni mezcla monedas.
- Interés simple semanal sobre el capital inicial:
  interés = capital × tasa semanal (%) × número de semanas.
- Resumen, estados básicos, exportación CSV y respaldo/restauración JSON.
- Modo local en este paquete: guarda información en el almacenamiento del navegador del dispositivo.

IMPORTANTE SOBRE LA NUBE
Esta versión todavía NO está conectada a Firebase ni tiene autenticación. Los registros permanecen en el navegador donde se introducen. Para cumplir el requisito de nube y acceso privado, hay que crear/configurar Firebase y publicar la app en un hosting HTTPS. No introduzcas datos reales de clientes hasta completar ese paso.

CONFIGURACIÓN DE FIREBASE (requiere tu autorización)
1. Entra a https://console.firebase.google.com/ con tu cuenta Google.
2. Crea un proyecto llamado control-cash.
3. Añade una aplicación web y copia la configuración Firebase.
4. Activa Authentication > Sign-in method > Email/Password.
5. Crea tu usuario administrador en Authentication.
6. Activa Cloud Firestore.
7. Configura reglas Firestore para que SOLO el UID del administrador pueda leer/escribir:

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null
           && request.auth.uid == "PEGA_AQUI_TU_UID_ADMIN";
       }
     }
   }

8. Publica la carpeta en un hosting HTTPS (por ejemplo Firebase Hosting).
9. Para sincronización real, la app necesita integrar Firebase Authentication y Firestore en app.js; no basta con pegar la configuración. Esta entrega es una base funcional local y el siguiente paso es completar esa integración y el despliegue.

INSTALAR EN IPHONE
1. Publica la aplicación en una URL HTTPS.
2. Abre esa URL en Safari.
3. Pulsa Compartir > Añadir a pantalla de inicio > Añadir.
4. Abre el icono desde la pantalla de inicio.

CÁLCULO FINANCIERO
Se usa interés simple semanal sobre el capital original, sin capitalización. La frecuencia de pago es un dato descriptivo y el sistema calcula fecha final según semanas. El usuario debe acordar y documentar las fechas reales de cuotas. La mora, penalidades, interés compuesto y calendario individual de cuotas no están implementados en esta versión.
Revisa la legalidad, tasas permitidas, contratos y obligaciones de protección de datos en tu jurisdicción antes de usar comercialmente.

SEGURIDAD
- No compartas respaldos CSV/JSON: contienen información financiera y personal.
- Usa bloqueo del iPhone y autenticación segura.
- No almacenes contraseñas dentro del código.
