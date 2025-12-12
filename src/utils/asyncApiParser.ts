// AsyncAPI Parser Utilities

export interface AsyncApiField {
  id: string;
  path: string;
  type: string;
  topic: string;
  description?: string;
}

export interface ParsedAsyncApi {
  id: string;
  name: string;
  version: string;
  channels: string[];
  fields: AsyncApiField[];
  rawContent: string;
}

function extractFieldsFromSchema(
  schema: Record<string, unknown>,
  basePath: string = '',
  topic: string,
  fields: AsyncApiField[] = [],
  idPrefix: string = ''
): AsyncApiField[] {
  if (!schema || typeof schema !== 'object') return fields;

  const properties = schema.properties as Record<string, unknown> | undefined;
  const type = schema.type as string | undefined;

  if (type === 'object' && properties) {
    Object.entries(properties).forEach(([key, value]) => {
      const currentPath = basePath ? `${basePath}.${key}` : key;
      const propSchema = value as Record<string, unknown>;
      const propType = propSchema.type as string | undefined;

      if (propType === 'object' && propSchema.properties) {
        // Recursively extract nested objects
        extractFieldsFromSchema(propSchema, currentPath, topic, fields, idPrefix);
      } else if (propType === 'array') {
        const items = propSchema.items as Record<string, unknown> | undefined;
        if (items?.type === 'object' && items?.properties) {
          extractFieldsFromSchema(items, `${currentPath}[]`, topic, fields, idPrefix);
        } else {
          fields.push({
            id: `${idPrefix}${currentPath.replace(/\./g, '-')}`,
            path: currentPath,
            type: `array<${(items?.type as string) || 'any'}>`,
            topic,
            description: propSchema.description as string | undefined,
          });
        }
      } else {
        fields.push({
          id: `${idPrefix}${currentPath.replace(/\./g, '-')}`,
          path: currentPath,
          type: (propType as string) || 'any',
          topic,
          description: propSchema.description as string | undefined,
        });
      }
    });
  }

  return fields;
}

export function parseAsyncApiSpec(content: string, fileName: string): ParsedAsyncApi | null {
  try {
    const spec = JSON.parse(content);
    
    const id = `asyncapi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = spec.info?.title || fileName.replace(/\.(json|yaml|yml)$/, '');
    const version = spec.info?.version || '1.0.0';
    const channels: string[] = [];
    const fields: AsyncApiField[] = [];

    // Extract channels and their message schemas
    if (spec.channels) {
      Object.entries(spec.channels).forEach(([channelName, channelDef]) => {
        channels.push(channelName);
        const channel = channelDef as Record<string, unknown>;
        
        // Handle subscribe/publish operations
        ['subscribe', 'publish'].forEach(operation => {
          const op = channel[operation] as Record<string, unknown> | undefined;
          if (op?.message) {
            const message = op.message as Record<string, unknown>;
            const payload = message.payload as Record<string, unknown>;
            if (payload) {
              extractFieldsFromSchema(payload, '', channelName, fields, `${id}-${channelName}-`);
            }
          }
        });
      });
    }

    // Also check components/schemas for reusable schemas
    if (spec.components?.schemas) {
      Object.entries(spec.components.schemas).forEach(([schemaName, schemaDef]) => {
        const topic = channels[0] || 'default';
        extractFieldsFromSchema(
          schemaDef as Record<string, unknown>,
          schemaName.toLowerCase(),
          topic,
          fields,
          `${id}-schema-${schemaName}-`
        );
      });
    }

    // If no fields found from channels, try to parse as a simple message schema
    if (fields.length === 0 && spec.payload) {
      extractFieldsFromSchema(spec.payload, '', name, fields, `${id}-`);
    }

    return {
      id,
      name,
      version,
      channels,
      fields,
      rawContent: content,
    };
  } catch (error) {
    console.error('Error parsing AsyncAPI spec:', error);
    return null;
  }
}

export function parseSimpleJsonSchema(content: string, fileName: string): ParsedAsyncApi | null {
  try {
    const schema = JSON.parse(content);
    const id = `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = schema.title || fileName.replace(/\.(json|yaml|yml)$/, '');
    const fields: AsyncApiField[] = [];

    // Try to extract fields from a simple JSON schema
    if (schema.properties) {
      extractFieldsFromSchema(schema, '', name, fields, `${id}-`);
    } else if (schema.type === 'object' || typeof schema === 'object') {
      // Try to infer schema from example object
      Object.entries(schema).forEach(([key, value]) => {
        if (key !== 'type' && key !== 'properties' && key !== '$schema') {
          fields.push({
            id: `${id}-${key}`,
            path: key,
            type: typeof value === 'object' ? 'object' : typeof value,
            topic: name,
          });
        }
      });
    }

    return {
      id,
      name,
      version: schema.version || '1.0.0',
      channels: [name],
      fields,
      rawContent: content,
    };
  } catch (error) {
    console.error('Error parsing JSON schema:', error);
    return null;
  }
}
