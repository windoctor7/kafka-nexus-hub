// Remove hardcoded SIDECAR_API
export const SIDECAR_WS_DEFAULT = 'ws://localhost:3001/logs';

export interface ClusterConfig {
    bootstrap_servers: string;
    topics: { topic: string; correlation_key: string }[];
    glueRegistryName: string;
    glueSchemaName: string;
    schemaRegistryUrl: string;
    avroSchemasProvider: string;
    authType: string;
    credentialId: string;
}

export interface IntegrationConfig {
    source_clusters: ClusterConfig[];
    destination_cluster: ClusterConfig & { topic: string };
    window_seconds: number;
    orchestratorTopic: string;
    integration_rules: any;
}

export const fetchConfig = async (baseUrl: string): Promise<IntegrationConfig> => {
    const response = await fetch(`${baseUrl}/config`);
    if (!response.ok) {
        throw new Error('Failed to fetch config');
    }
    return response.json();
};

export const updateConfig = async (baseUrl: string, config: IntegrationConfig): Promise<void> => {
    const response = await fetch(`${baseUrl}/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    });
    if (!response.ok) {
        throw new Error('Failed to update config');
    }
};
