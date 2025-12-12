export const sourceClusters = [
  {
    id: "cluster-1",
    name: "Production Cluster Alpha",
    bootstrapServers: "kafka-prod-1.example.com:9092,kafka-prod-2.example.com:9092",
    topics: ["TP-LOAN-ORIGINATION", "TP-LOAN-DISBURSEMENT"],
    authType: "PEM" as const,
    status: "online" as const,
    messagesPerMinute: 1250,
  },
  {
    id: "cluster-2", 
    name: "Production Cluster Beta",
    bootstrapServers: "kafka-prod-3.example.com:9092",
    topics: ["TP-PAYMENT-EVENTS", "TP-ACCOUNT-UPDATES"],
    authType: "JKS" as const,
    status: "online" as const,
    messagesPerMinute: 890,
  },
  {
    id: "cluster-3",
    name: "Staging Cluster",
    bootstrapServers: "kafka-staging.example.com:9092",
    topics: ["TP-TEST-EVENTS"],
    authType: "NONE" as const,
    status: "offline" as const,
    messagesPerMinute: 0,
  },
];

export const destinationCluster = {
  id: "dest-1",
  name: "Integration Hub",
  bootstrapServers: "kafka-integrated.example.com:9092",
  topic: "TP-LOAN-INTEGRATED",
  status: "online" as const,
};

export const sourceFields = [
  { id: "f1", topic: "TP-LOAN-ORIGINATION", path: "operation.loan.id", type: "string" },
  { id: "f2", topic: "TP-LOAN-ORIGINATION", path: "operation.loan.amount", type: "number" },
  { id: "f3", topic: "TP-LOAN-ORIGINATION", path: "operation.loan.currency", type: "string" },
  { id: "f4", topic: "TP-LOAN-ORIGINATION", path: "operation.customer.id", type: "string" },
  { id: "f5", topic: "TP-LOAN-ORIGINATION", path: "operation.customer.name", type: "string" },
  { id: "f6", topic: "TP-LOAN-ORIGINATION", path: "operation.timestamp", type: "datetime" },
  { id: "f7", topic: "TP-LOAN-DISBURSEMENT", path: "disbursement.id", type: "string" },
  { id: "f8", topic: "TP-LOAN-DISBURSEMENT", path: "disbursement.amount", type: "number" },
  { id: "f9", topic: "TP-LOAN-DISBURSEMENT", path: "disbursement.status", type: "string" },
  { id: "f10", topic: "TP-LOAN-DISBURSEMENT", path: "disbursement.bankAccount", type: "string" },
];

export const destinationFields = [
  { id: "d1", path: "transaction.id", type: "string", required: true },
  { id: "d2", path: "transaction.totalAmount", type: "number", required: true },
  { id: "d3", path: "transaction.currency", type: "string", required: true },
  { id: "d4", path: "transaction.customerId", type: "string", required: true },
  { id: "d5", path: "transaction.customerName", type: "string", required: false },
  { id: "d6", path: "transaction.disbursementId", type: "string", required: false },
  { id: "d7", path: "transaction.status", type: "string", required: true },
  { id: "d8", path: "transaction.timestamp", type: "datetime", required: true },
];

export const integrationRules = [
  { source: "TP-LOAN-ORIGINATION", field: "operation.loan.id", target: "transaction.id" },
  { source: "TP-LOAN-ORIGINATION", field: "operation.loan.amount", target: "transaction.totalAmount" },
  { source: "TP-LOAN-ORIGINATION", field: "operation.loan.currency", target: "transaction.currency" },
  { source: "TP-LOAN-ORIGINATION", field: "operation.customer.id", target: "transaction.customerId" },
  { source: "TP-LOAN-ORIGINATION", field: "operation.customer.name", target: "transaction.customerName" },
  { source: "TP-LOAN-DISBURSEMENT", field: "disbursement.id", target: "transaction.disbursementId" },
  { source: "TP-LOAN-DISBURSEMENT", field: "disbursement.status", target: "transaction.status" },
  { source: "TP-LOAN-ORIGINATION", field: "operation.timestamp", target: "transaction.timestamp" },
];

export const metricsData = [
  { time: "00:00", messages: 850, errors: 12 },
  { time: "01:00", messages: 720, errors: 8 },
  { time: "02:00", messages: 580, errors: 5 },
  { time: "03:00", messages: 420, errors: 3 },
  { time: "04:00", messages: 380, errors: 2 },
  { time: "05:00", messages: 520, errors: 4 },
  { time: "06:00", messages: 890, errors: 7 },
  { time: "07:00", messages: 1250, errors: 15 },
  { time: "08:00", messages: 1580, errors: 22 },
  { time: "09:00", messages: 1820, errors: 18 },
  { time: "10:00", messages: 1950, errors: 25 },
  { time: "11:00", messages: 2100, errors: 28 },
  { time: "12:00", messages: 1890, errors: 20 },
];

export const traceData = {
  "TXN-2024-001234": {
    transactionId: "TXN-2024-001234",
    steps: [
      { step: "Recibido", status: "completed", timestamp: "2024-01-15T10:30:00Z", topic: "TP-LOAN-ORIGINATION", details: "Mensaje recibido del origen" },
      { step: "Validado", status: "completed", timestamp: "2024-01-15T10:30:01Z", details: "Esquema JSON validado correctamente" },
      { step: "Procesado", status: "completed", timestamp: "2024-01-15T10:30:02Z", details: "Reglas de transformación aplicadas" },
      { step: "Enviado", status: "completed", timestamp: "2024-01-15T10:30:03Z", topic: "TP-LOAN-INTEGRATED", details: "Mensaje publicado exitosamente" },
    ],
  },
  "TXN-2024-001235": {
    transactionId: "TXN-2024-001235",
    steps: [
      { step: "Recibido", status: "completed", timestamp: "2024-01-15T10:31:00Z", topic: "TP-LOAN-DISBURSEMENT", details: "Mensaje recibido del origen" },
      { step: "Validado", status: "error", timestamp: "2024-01-15T10:31:01Z", details: "Error: Campo 'amount' requerido no encontrado" },
      { step: "Procesado", status: "pending", timestamp: null, details: "Esperando validación" },
      { step: "Enviado", status: "pending", timestamp: null, details: "Pendiente" },
    ],
  },
};

export const dashboardStats = {
  successfulToday: 45892,
  errorsToday: 127,
  avgProcessingTime: "23ms",
  uptime: "99.97%",
};
