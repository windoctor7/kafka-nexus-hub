import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// --- Configuración ---
const CLUSTER_1 = {
    brokers: ['localhost:9097'],
    clientId: 'test-producer-1',
    topic: 'TP-CREDITO-COBRANZA-INVESTIGACION-PRESTAMO-V1-ABONO-ADD'
};

const CLUSTER_2 = {
    brokers: ['localhost:9098'],
    clientId: 'test-producer-2',
    topic: 'TP-SISTEMAS-CAJA-CENTRALIZACION-CAJA-V1-CREDITO-ADD'
};

// Parse arguments only if running directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const args = process.argv.slice(2);
    const mode = args.includes('intercalate') ? 'intercalate' : (args.includes('error') ? 'error' : 'success');

    let successCount = 0;
    let errorCount = 0;

    if (mode === 'intercalate') {
        const numbers = args.filter(arg => !isNaN(parseInt(arg))).map(Number);
        successCount = numbers[0] || 1;
        errorCount = numbers[1] || 1;
    } else {
        const countArg = args.find(arg => !isNaN(parseInt(arg)));
        const count = countArg ? parseInt(countArg) : 1;
        if (mode === 'error') errorCount = count;
        else successCount = count;
    }

    publish(successCount, errorCount);
}



export async function publish(successCount, errorCount) {
    const totalCount = successCount + errorCount;
    const mode = (successCount > 0 && errorCount > 0) ? 'INTERCALATE' : (errorCount > 0 ? 'ERROR' : 'SUCCESS');

    // Generate task list
    const tasks = [];
    for (let i = 0; i < successCount; i++) tasks.push({ type: 'success' });
    for (let i = 0; i < errorCount; i++) tasks.push({ type: 'error' });

    // Shuffle tasks
    for (let i = tasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    }

    console.log(`\n🚀 Iniciando publicación de eventos`);
    console.log(`   Modo: ${mode}`);
    console.log(`   Total: ${totalCount} (Success: ${successCount}, Error: ${errorCount})\n`);

    const kafka1 = new Kafka({ clientId: CLUSTER_1.clientId, brokers: CLUSTER_1.brokers });
    const producer1 = kafka1.producer();

    const kafka2 = new Kafka({ clientId: CLUSTER_2.clientId, brokers: CLUSTER_2.brokers });
    const producer2 = kafka2.producer();

    // Cluster 1 handles Topic 1 AND Topic 3
    const topic3 = "TP-CC-LOAN-GLOBAL-BALANCES-ADDITIONAL-INFORMATION-V1-LOAN-ADD";

    try {
        await producer1.connect();
        await producer2.connect();

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const isError = task.type === 'error';
            const uuid = uuidv4();
            const timestamp = new Date().toISOString();

            // Payload 1
            const payload1 = {
                operacion: {
                    detalleStaging: {
                        uuidTrazabilidad: uuid,
                        topicosIntegrados: [
                            { nombre: "TP-CREDITO-COBRANZA-INVESTIGACION-PRESTAMO-V1-ABONO-ADD", numeroMensajes: 1 },
                            { nombre: "TP-SISTEMAS-CAJA-CENTRALIZACION-CAJA-V1-CREDITO-ADD", numeroMensajes: 1 },
                            { nombre: topic3, numeroMensajes: 1 }
                        ]
                    },
                    monto: 1500.00,
                    moneda: "MXN",
                    tipo: "ABONO",
                    timestamp: timestamp
                }
            };

            // Payload 2
            const payload2 = {
                operacion: {
                    idTrazabilidad: uuid,
                    sucursal: "SUC-001",
                    cajero: "CAJ-99",
                    tipo: "CREDITO",
                    timestamp: timestamp
                }
            };

            // Payload 3
            const payload3 = {
                operation: {
                    eventDetail: {
                        uuidTracking: uuid
                    },
                    additionalData: "Some extra info",
                    timestamp: timestamp
                }
            };

            // Determine which messages to send
            let messagesToSend = [1, 2, 3];

            if (isError) {
                // Always send 1 (Orchestrator). Randomly omit 2 or 3 or both.
                // Possible error subsets: [1], [1, 2], [1, 3]
                // (Note: [1, 2, 3] is success)

                const combinations = [
                    [1],       // Missing 2 and 3
                    [1, 2],    // Missing 3
                    [1, 3]     // Missing 2
                ];
                messagesToSend = combinations[Math.floor(Math.random() * combinations.length)];
                console.log(`[${i + 1}/${totalCount}] ⚠️ Simulación Error (${uuid}): Enviando solo mensajes [${messagesToSend.join(', ')}]`);
            } else {
                console.log(`[${i + 1}/${totalCount}] ✅ Éxito (${uuid}): Enviando todos los mensajes`);
            }

            // Send Message 1 (Cluster 1)
            if (messagesToSend.includes(1)) {
                await producer1.send({
                    topic: CLUSTER_1.topic,
                    messages: [{ value: JSON.stringify(payload1) }],
                });
            }

            // Send Message 2 (Cluster 2)
            if (messagesToSend.includes(2)) {
                await producer2.send({
                    topic: CLUSTER_2.topic,
                    messages: [{ value: JSON.stringify(payload2) }],
                });
            }

            // Send Message 3 (Cluster 1)
            if (messagesToSend.includes(3)) {
                await producer1.send({
                    topic: topic3,
                    messages: [{ value: JSON.stringify(payload3) }],
                });
            }

            // Small delay between messages
            if (totalCount > 1) await new Promise(r => setTimeout(r, 100));
        }

    } catch (e) {
        console.error(`❌ Error publicando eventos: ${e.message}`);
    } finally {
        await producer1.disconnect();
        await producer2.disconnect();
    }

    console.log("\n✨ Proceso finalizado.");
}
