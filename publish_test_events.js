import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Parse arguments
const args = process.argv.slice(2);
const isErrorMode = args.includes('error');
// Find a number in args, default to 1
const countArg = args.find(arg => !isNaN(parseInt(arg)));
const count = countArg ? parseInt(countArg) : 1;

console.log(`\n🚀 Iniciando publicación de eventos`);
console.log(`   Modo: ${isErrorMode ? 'ERROR (Transacciones incompletas)' : 'SUCCESS (Transacciones completas)'}`);
console.log(`   Cantidad: ${count}\n`);

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

async function publish() {
    const kafka1 = new Kafka({ clientId: CLUSTER_1.clientId, brokers: CLUSTER_1.brokers });
    const producer1 = kafka1.producer();

    const kafka2 = new Kafka({ clientId: CLUSTER_2.clientId, brokers: CLUSTER_2.brokers });
    const producer2 = kafka2.producer();

    try {
        await producer1.connect();
        if (!isErrorMode) {
            await producer2.connect();
        }

        for (let i = 0; i < count; i++) {
            const uuid = uuidv4();
            const timestamp = new Date().toISOString();

            // Payload 1
            const payload1 = {
                operacion: {
                    detalleStaging: {
                        uuidTrazabilidad: uuid,
                        topicosIntegrados: [
                            {
                                nombre: "TP-CREDITO-COBRANZA-INVESTIGACION-PRESTAMO-V1-ABONO-ADD",
                                numeroMensajes: 1
                            },
                            {
                                nombre: "TP-SISTEMAS-CAJA-CENTRALIZACION-CAJA-V1-CREDITO-ADD",
                                numeroMensajes: 1
                            }
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

            // Send to Cluster 1
            await producer1.send({
                topic: CLUSTER_1.topic,
                messages: [{ value: JSON.stringify(payload1) }],
            });
            console.log(`[${i + 1}/${count}] ✅ Cluster 1: ${uuid}`);

            if (isErrorMode) {
                console.log(`[${i + 1}/${count}] ⚠️ Saltando Cluster 2 (Simulación Error)`);
            } else {
                // Send to Cluster 2
                await producer2.send({
                    topic: CLUSTER_2.topic,
                    messages: [{ value: JSON.stringify(payload2) }],
                });
                console.log(`[${i + 1}/${count}] ✅ Cluster 2: ${uuid}`);
            }

            // Small delay between messages to avoid overwhelming local Kafka
            if (count > 1) await new Promise(r => setTimeout(r, 100));
        }

    } catch (e) {
        console.error(`❌ Error publicando eventos: ${e.message}`);
    } finally {
        await producer1.disconnect();
        if (!isErrorMode) {
            await producer2.disconnect();
        }
    }

    console.log("\n✨ Proceso finalizado.");
}

publish();
