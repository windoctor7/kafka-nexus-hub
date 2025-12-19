# Guía de Inicio - Observabilidad e Integración (Sidecar)

He implementado una **Arquitectura de Sidecar Desacoplada** que conecta el Portal React con el Backend Java sin modificar la lógica central del backend.

## 1. Visión General de la Arquitectura

- **Backend Java (Pasivo)**:
    - Corre en el puerto `8080`.
    - Escribe logs estructurados JSON en `logs/integration-events.json`.
    - Lee la configuración de `src/main/resources/config.json`.
- **Sidecar Node.js (Activo)**:
    - Corre en el puerto `3001`.
    - Actúa como puente: Lee/Escribe `config.json` y transmite logs vía WebSocket.
- **Portal Frontend**:
    - Corre en el puerto `5173`.
    - Se conecta a la API del Sidecar (`http://localhost:3001`) para obtener datos.

## 2. Infraestructura (Kafka)

Debido a conflictos de puertos con IDE/Docker, la infraestructura de Kafka se migró a:

| Cluster | Puerto | Rol |
| :--- | :--- | :--- |
| **Origen 1** | `9097` | Simula sistema origen (Créditos) |
| **Origen 2** | `9098` | Simula sistema origen (Caja) |
| **Destino** | `9099` | Recibe mensajes integrados |

## 3. Pasos de Verificación

### A. Gestión de Clusters
1. Navega a **Clusters** (`/clusters`).
2. Deberías ver 3 clusters configurados:
    - **Source Cluster 1**: `localhost:9097`
    - **Source Cluster 2**: `localhost:9098`
    - **Destination Cluster**: `localhost:9099`
3. **Prueba:** Intenta editar el nombre de un cluster y guardar. Debería persistir en `config.json`.

### B. Reglas de Integración
1. Navega a **Reglas de Integración** (`/rules`).
2. Deberías ver las reglas cargadas desde el backend.
3. **Prueba:** Cambia al "Modo Código" para ver la estructura JSON cruda.

### C. Trazabilidad en Vivo
1. Navega a **Trazabilidad** (`/traceability`).
2. Mira el panel de **Live Backend Logs** en la parte inferior.
3. **Prueba:** Deberías ver un indicador verde "Live" y los logs del sistema conectándose.

## 4. Cómo Ejecutar (Manual)

Si necesitas reiniciar los servicios manualmente:

**Terminal 1 (Sidecar)**
```bash
cd kafka-nexus-hub
node server.js
```

**Terminal 2 (Frontend)**
```bash
cd kafka-nexus-hub
npm run dev
```

**Terminal 3 (Backend)**
```bash
cd ms-tra-transaction-integrator-cobranza
mvn spring-boot:run -s temporary-settings.xml -Dmaven.repo.local=./.mvn_repo_clean
```

## 5. Pruebas Automatizadas E2E (Cypress)

Implementamos una suite de pruebas E2E robusta usando Cypress para validar las capacidades en tiempo real del Dashboard.

### Características Clave
- **Robot de Prueba:** Una suite de Cypress que actúa como usuario, haciendo clic y verificando elementos de UI.
- **Control de Entorno:** Un endpoint de API dedicado (`POST /api/test/trigger`) en el Sidecar permite al test inyectar eventos Kafka (Éxito/Error) programáticamente sin herramientas externas.
- **Selectores Robustos:** Los componentes de UI usan atributos `data-testid` para asegurar que los tests resistan cambios de estilo.

### Escenarios de Prueba
1.  **Selección de Integrador:** Verifica el flujo desde la página de inicio hasta el Dashboard.
2.  **Transacciones Exitosas:** Dispara eventos de éxito y verifica el contador "Transacciones Exitosas" y la entrada en el feed "Integración Exitosa".
3.  **Errores de Validación:** Dispara eventos de error y verifica el contador "Errores de Validación" y la alerta "Transacción Expirada" (tomando en cuenta los timeouts del backend).
4.  **Gráficos en Tiempo Real:** Verifica que el `AreaChart` renderice puntos de datos al recibir eventos.

### Cómo Ejecutar los Tests
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Sidecar
node server.js

# Terminal 3: Cypress
npx cypress open
```
