import { Writer } from "k6/x/kafka";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { b64encode } from "k6/encoding";
import { sleep } from "k6";

// Configuración de Kafka
const topic1 = "TP-CREDITO-COBRANZA-INVESTIGACION-PRESTAMO-V1-ABONO-ADD";
const topic2 = "TP-SISTEMAS-CAJA-CENTRALIZACION-CAJA-V1-CREDITO-ADD";
const topic3 = "TP-CC-LOAN-GLOBAL-BALANCES-ADDITIONAL-INFORMATION-V1-LOAN-ADD";

const writer1 = new Writer({
    brokers: ["localhost:9097"],
    topic: topic1,
    autoCreateTopic: true,
});

const writer2 = new Writer({
    brokers: ["localhost:9098"],
    topic: topic2,
    autoCreateTopic: true,
});

const writer3 = new Writer({
    brokers: ["localhost:9097"],
    topic: topic3,
    autoCreateTopic: true,
});

export const options = {
    scenarios: {
        fixed_iterations: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 50,
            maxDuration: '30s',
        },
    },
};

export default function () {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    const payload1 = {
        operacion: {
            detalleStaging: {
                uuidTrazabilidad: correlationId,
                topicosIntegrados: [
                    { nombre: topic1, numeroMensajes: 1 },
                    { nombre: topic2, numeroMensajes: 1 },
                    { nombre: topic3, numeroMensajes: 1 }
                ]
            },
            monto: 1500.00,
            moneda: "MXN",
            tipo: "ABONO",
            timestamp: timestamp
        }
    };

    const payload2 = {
        operacion: {
            idTrazabilidad: correlationId,
            sucursal: "SUC-001",
            cajero: "CAJ-99",
            tipo: "CREDITO",
            timestamp: timestamp
        }
    };

    const payload3 = {
        operation: {
            eventDetail: {
                uuidTracking: correlationId
            },
            additionalData: "Some extra info",
            timestamp: timestamp
        }
    };

    // Deterministic Error Generation
    // We want exactly 3 errors at the START of the test.
    // This ensures they expire (20s window) well before the Cypress timeout (30s).

    // Use execution.scenario.iterationInTest to track progress
    // Note: This requires the 'k6/execution' module
    // If not available, we can use a simpler modulo or just random with high probability for first N seconds?
    // Actually, 'k6/execution' is standard in recent k6.
    // Let's assume we can't rely on it and use a simpler approach:
    // We can't easily share state between VUs without xk6-counter or similar.
    // BUT, we configured `vus: 1` and `iterations: 50`. So it IS sequential!
    // We can use a global counter? No, k6 resets context.

    // Alternative: Use the timestamp or just random?
    // User wants deterministic.
    // With `vus: 1`, we can use `__ITER`.

    let messagesToSend = [1, 2, 3];

    // Force error for the first 3 iterations (0, 1, 2)
    if (__ITER < 3) {
        // Simulate missing topics (Error)
        // Send only Topic 1 (Orchestrator)
        messagesToSend = [1];
        console.log(`Simulando error (Iteración ${__ITER}) para ${correlationId}`);
    } else {
        // Success (Topics 1, 2, 3)
        messagesToSend = [1, 2, 3];
    }

    if (messagesToSend.includes(1)) {
        writer1.produce({ messages: [{ value: b64encode(JSON.stringify(payload1)) }] });
    }
    if (messagesToSend.includes(2)) {
        writer2.produce({ messages: [{ value: b64encode(JSON.stringify(payload2)) }] });
    }
    if (messagesToSend.includes(3)) {
        writer3.produce({ messages: [{ value: b64encode(JSON.stringify(payload3)) }] });
    }

    // Pace requests to avoid overwhelming local broker/backend
    sleep(0.01);
}

export function teardown() {
    writer1.close();
    writer2.close();
    writer3.close();
}
