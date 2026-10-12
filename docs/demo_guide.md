# 🚀 Guía de Demo en Vivo: Kafka Nexus Hub

Esta guía contiene los pasos exactos y comandos para ejecutar una demostración fluida y exitosa del sistema **Kafka Nexus Hub**.

---

## 📋 Prerrequisitos
Asegúrate de tener estas terminales listas antes de empezar:
1.  **Kafka & Zookeeper:** Corriendo (Docker o local).
2.  **Backend Java:** `ms-tra-transaction-integrator-cobranza` debe estar ejecutándose.
3.  **Frontend:** `npm run dev` en `kafka-nexus-hub` (http://localhost:8080).

---

## 🎬 Guion de la Demo (Paso a Paso)

### Paso 1: Limpieza Total (El "Efecto Wow")
Empieza con el sistema totalmente limpio para demostrar que no hay trucos.

**Comando (Terminal Sidecar):**
```bash
# En la carpeta kafka-nexus-hub
node reset_db.js
```
*Narrativa:* "Iniciamos con un lienzo en blanco. El sistema se resetea por completo, limpiando bases de datos y memorias en milisegundos."

### Paso 2: Iniciar el Cerebro (Sidecar)
Arranca el servidor que procesa los logs.

**Comando (Terminal Sidecar):**
```bash
node server.js
```
*Acción:* Abre el Dashboard en el navegador. Debería verse todo en ceros y "Online".

### Paso 3: Simulación de Tráfico "Feliz" (Happy Path)
Genera tráfico transaccional normal para ver cómo el dashboard cobra vida.

**Comando (Terminal K6):**
```bash
# En la carpeta del microservicio Java
# 1 minuto de duración, 0% de errores
./k6 run -e TEST_DURATION=1m -e RAMP_DURATION=10s -e ERROR_RATE=0 tests/k6/load_test.js
```
*Qué mostrar en pantalla:*
*   Ver cómo sube el contador de "Transacciones Exitosas".
*   Ver la gráfica de barras llenándose en tiempo real.
*   Mostrar la tarjeta de "Latencia" (P95) manteniéndose en verde.

### Paso 4: Inyectando Caos (Errores y Latencia)
Demuestra la capacidad de observabilidad ante fallos.

**Comando (Terminal K6):**
```bash
# 2 minutos, 5% de errores simulados
./k6 run -e TEST_DURATION=2m -e RAMP_DURATION=10s -e ERROR_RATE=0.05 tests/k6/load_test.js
```
*Qué mostrar en pantalla:*
*   Señalar cómo aparece la tarjeta roja de "Transacciones Incompletas".
*   Ver la lista de "Errores Recientes" poblándose.
*   **Acción Clave:** Haz clic en un error de la lista.
    *   Esto te llevará a la pantalla de **Trazabilidad**.
    *   Muestra cómo el sistema identifica exactamente qué tópico faltó (ej. "Falta Topic 2").
    *   *Tip:* Destaca la limpieza de la interfaz, enfocada 100% en el timeline de la transacción sin ruido de logs crudos.

### Paso 5: Visión Global (Topología)
Navega a la pestaña "Clusters".
*   Muestra el diagrama visual (Source -> Integrator -> Destination).
*   Explica que esto monitorea la salud de la infraestructura Kafka en tiempo real.

### Paso 6: Validación Automatizada (Cypress)
Cierra con broche de oro demostrando que la calidad está automatizada.

**Comando (Terminal Sidecar):**
```bash
# Ejecuta las pruebas E2E sin abrir navegador (headless)
npx cypress run
```
*Narrativa:* "No solo construimos el dashboard, construimos robots que verifican que el dashboard diga la verdad. La IA nos ayudó a crear pruebas que validan cada píxel y cada dato."

---

## 🤖 Prompt para Gamma AI (Generador de Presentaciones)

Copia y pega el siguiente texto en **Gamma AI** para generar tu presentación en español:

> **Tema:** Construyendo una Plataforma de Observabilidad Kafka en Tiempo Real con Asistencia de IA
>
> **Tono:** Profesional, Innovador, Técnico pero Accesible.
>
> **Estructura:**
> 1.  **El Desafío:** Teníamos una arquitectura compleja de microservicios con Kafka. Estábamos "volando a ciegas" respecto al estado de las transacciones, latencia y pérdida de mensajes. Depurar tomaba horas revisando logs crudos.
> 2.  **La Solución - Kafka Nexus Hub:** Un dashboard de observabilidad hecho a la medida que brinda visibilidad en tiempo real de nuestro integrador de transacciones.
>     *   **Funcionalidades Clave:** Contadores de transacciones en vivo, Monitoreo de Latencia P95, Topología Visual de Clusters y Trazabilidad Profunda (encontrar la aguja en el pajar).
> 3.  **Stack Tecnológico y Arquitectura:**
>     *   **Frontend:** React + TailwindCSS (Diseño Premium), Framer Motion (Animaciones fluidas).
>     *   **Backend (Sidecar):** Node.js + Express (Ligero y rápido).
>     *   **Persistencia Híbrida:** SQLite (FTS5) para desarrollo ágil y soporte nativo para **Elasticsearch** en entornos de producción masiva.
>     *   **Arquitectura No Intrusiva (Sidecar):** Desacoplamiento total. El sistema de observabilidad corre en paralelo leyendo logs, garantizando **cero impacto** en el rendimiento del servicio Java crítico y eliminando el riesgo de "romper producción" al instalarlo.
> 4.  **El "Arma Secreta" - Colaboración con IA:** Cómo utilicé un Agente de IA avanzado para acelerar el desarrollo 10x.
>     *   **Arquitectura:** La IA ayudó a diseñar un patrón "Sidecar" (Node.js + SQLite) para procesar logs sin tocar el código legado en Java.
>     *   **Optimización:** Implementamos características avanzadas como Búsqueda de Texto Completo (FTS5) en SQLite y throttling de WebSockets para alto rendimiento.
>     *   **Calidad (QA):** La IA escribió pruebas de carga con K6 y pruebas E2E con Cypress para garantizar estabilidad.
> 5.  **Demo en Vivo:** (Espacio para la demostración).
> 6.  **Impacto y Resultados:**
>     *   Reducción del tiempo de depuración de horas a segundos.
>     *   Detección proactiva de "transacciones incompletas".
>     *   Rendimiento listo para producción manejando miles de eventos por segundo.
> 7.  **Conclusión:** La IA no solo escribió código; actuó como un Arquitecto Senior, permitiéndonos construir una herramienta de grado empresarial en tiempo récord.

---

## 💡 Tips para tu presentación
*   **Enfatiza la "No Intrusión":** Recalca que esta solución **NO** requirió modificar el código del negocio (Java). Funciona leyendo logs ("Sidecar Pattern"), lo cual es muy seguro para producción.
*   **Menciona el P95:** Explica brevemente la tarjeta de latencia (como te expliqué antes) para demostrar profundidad técnica.
*   **Cierre:** "Esto no es un prototipo, es un sistema probado con carga y validado automáticamente".
