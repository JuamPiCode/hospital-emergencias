# Pulso · Emergencias hospitalarias

Prototipo académico de gestión de emergencias. Usa exclusivamente cuentas, pacientes, ingresos y antecedentes ficticios. El personal selecciona manualmente la prioridad en cada registro.

## Ejecutar con Visual Studio Code y Live Server

1. En Visual Studio Code, selecciona **Archivo → Abrir carpeta** y elige la carpeta que contiene `index.html`.
2. Con la extensión Live Server disponible en tu VS Code, haz clic derecho en `index.html` y selecciona **Open with Live Server**.
3. En la pestaña que se abre, inicia sesión con una cuenta de prueba. Los botones bajo **Cuentas de prueba** rellenan ambos campos.

Abre siempre el mismo origen local (protocolo, host y puerto) para conservar lo guardado. Los módulos JavaScript se cargan a través de un servidor HTTP local. El proyecto no requiere compilación, paquetes, servicios externos ni conectividad a internet para ejecutarse.

## Cuentas ficticias

| Rol | Usuario | Contraseña de prueba | Permisos en el prototipo |
| --- | --- | --- | --- |
| Administrador | `admin` | `PulsoAdmin24` | Panel, cola, registro, cambios de estado e historial |
| Médico | `medico` | `PulsoMedico24` | Panel, cola, cambios de estado e historial |
| Recepcionista | `recepcion` | `PulsoRecepcion24` | Panel, consulta de cola y registro |

## Recorrido de prueba

1. Como administrador, registra un ingreso con DNI ficticio de ocho dígitos, por ejemplo `90000100`. Selecciona una prioridad y guarda.
2. En **Cola de emergencias**, busca ese DNI. La tabla se ordena por prioridad y luego por hora de llegada. Pulsa **Iniciar atención** y luego **Finalizar atención**.
3. En **Historial médico**, busca el mismo DNI, abre el historial y agrega una observación ficticia. Para ver ingresos anteriores precargados, busca `90000001` y cambia la atención en el selector.
4. Recarga la página y comprueba que la sesión, el ingreso, el estado y la observación siguen disponibles. Cierra sesión desde el perfil para probar otro rol.

La cola muestra ingresos abiertos y finalizados hoy. El indicador de registros cuenta pacientes únicos y el promedio toma los minutos de espera de los ingresos visibles en la cola. La espera se detiene al iniciar la atención. Las alertas de demostración usan ocho puestos de referencia y un umbral de espera de 60 minutos. El gráfico de actividad agrupa ingresos y finalizaciones según la fecha local.

## Estructura

```text
index.html  Interfaz base, acceso y navegación
styles.css  Diseño responsive, gráficos y estados visuales
app.js      Navegación, formularios y eventos
vistas.js   Plantillas, tablas y gráficos accesibles
datos.js    Repositorio local, validaciones, datos de prueba e indicadores
README.md   Ejecución, credenciales y recorrido de prueba
```

## Persistencia e integración futura

`datos.js` centraliza la sesión y el repositorio en `localStorage`. El almacenamiento guarda el identificador de la cuenta ficticia, pacientes, ingresos y observaciones. La autenticación y los permisos son simulados en el navegador. Usa únicamente datos ficticios. Para comenzar de nuevo, borra las claves `pulso.datos.v1` y `pulso.sesion.v1` en el almacenamiento local del sitio.

Para integrar la API REST, sustituye las operaciones asíncronas del repositorio por llamadas `fetch` y conserva el modelo de pacientes, ingresos y observaciones. Adapta la sesión simulada a la autenticación del servidor y aplica allí los permisos y las transiciones de estado. La API podrá usar una base de datos externa. Los archivos estáticos se pueden servir desde Lightsail cuando se configure el despliegue.
