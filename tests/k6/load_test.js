import { Writer, SchemaRegistry, Reader, Connection } from "k6/x/kafka";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { b64encode } from "k6/encoding";

const produceTrend = new Trend("kafka_produce_duration");

// Configuración de Kafka
const brokers = ["localhost:9097", "localhost:9098"];
const topic1 = "TP-CREDITO-COBRANZA-INVESTIGACION-PRESTAMO-V1-ABONO-ADD";
const topic2 = "TP-SISTEMAS-CAJA-CENTRALIZACION-CAJA-V1-CREDITO-ADD";
const topic3 = "TP-CC-LOAN-GLOBAL-BALANCES-ADDITIONAL-INFORMATION-V1-LOAN-ADD";
const outputTopic = "TP-CC-DESTINO-V1-MESSAGES-INTEGRATED-ADD";

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
    brokers: ["localhost:9097"], // Cluster 1 as requested
    topic: topic3,
    autoCreateTopic: true,
});

// Opcional: Reader para verificar la salida (si se desea validar E2E)
// const reader = new Reader({
//     brokers: ["localhost:9099"],
//     topic: outputTopic,
//     groupID: "k6-verifier-group",
// });

// Configurable duration (default 5m)
const testDuration = __ENV.TEST_DURATION || '5m';
const rampDuration = __ENV.RAMP_DURATION || '30s';

export const options = {
    scenarios: {
        ramping_load: {
            executor: 'ramping-arrival-rate',
            startRate: 0,
            timeUnit: '1s',
            preAllocatedVUs: 20,
            maxVUs: 100,
            stages: [
                { target: 50, duration: rampDuration }, // Ramp-up (calentamiento)
                { target: 50, duration: testDuration },
                { target: 0, duration: rampDuration },   // Ramp-down (enfriamiento)
            ],
        },
    },
};

export default function () {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    // Payload 1 (Abono)
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

    // Payload 2 (Crédito)
    const payload2 = {
        operacion: {
            idTrazabilidad: correlationId,
            sucursal: "SUC-001",
            cajero: "CAJ-99",
            tipo: "CREDITO",
            timestamp: timestamp
        }
    };

    // Payload 3 (Additional Info)
    const payload3 = {
        operation: {
            eventDetail: {
                uuidTracking: correlationId
            },
            additionalData: "Some extra info",
            timestamp: timestamp
        }
    };

    // Determine which messages to send
    // Configurable error rate (default 0.5%)
    // Run with: k6 run -e ERROR_RATE=0 tests/k6/load_test.js (for 100% success)
    const errorRate = __ENV.ERROR_RATE !== undefined ? parseFloat(__ENV.ERROR_RATE) : 0.005;

    let messagesToSend = [1, 2, 3];
    if (Math.random() < errorRate) {
        const combinations = [
            [1],       // Missing 2 and 3
            [1, 2],    // Missing 3
            [1, 3]     // Missing 2
        ];
        messagesToSend = combinations[Math.floor(Math.random() * combinations.length)];
        console.log(`Simulando error para ${correlationId}: Enviando [${messagesToSend.join(', ')}]`);
    }

    // Enviar mensaje 1 (Always sent if in list, which it always is)
    if (messagesToSend.includes(1)) {
        const start = Date.now();
        try {
            writer1.produce({
                messages: [
                    {
                        value: b64encode(JSON.stringify(payload1)),
                    },
                ],
            });
            produceTrend.add(Date.now() - start);
        } catch (error) {
            console.error(`Error enviando a ${topic1}:`, error);
        }
    }

    // Enviar mensaje 2
    if (messagesToSend.includes(2)) {
        const start = Date.now();
        try {
            writer2.produce({
                messages: [
                    {
                        value: b64encode(JSON.stringify(payload2)),
                    },
                ],
            });
            produceTrend.add(Date.now() - start);
        } catch (error) {
            console.error(`Error enviando a ${topic2}:`, error);
        }
    }

    // Enviar mensaje 3
    if (messagesToSend.includes(3)) {
        const start = Date.now();
        try {
            writer3.produce({
                messages: [
                    {
                        value: b64encode(JSON.stringify(payload3)),
                    },
                ],
            });
            produceTrend.add(Date.now() - start);
        } catch (error) {
            console.error(`Error enviando a ${topic3}:`, error);
        }
    }

    console.log(`Enviados mensajes correlacionados: ${correlationId}`);

    // sleep(1); // Controlado por el executor constant-arrival-rate
}

export function teardown() {
    writer1.close();
    writer2.close();
    writer3.close();
    // reader.close();
}
