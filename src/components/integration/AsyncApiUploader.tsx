import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ParsedAsyncApi, parseAsyncApiSpec, parseSimpleJsonSchema } from '@/utils/asyncApiParser';
import { toast } from 'sonner';
import { useState } from 'react';

interface AsyncApiUploaderProps {
  loadedApis: ParsedAsyncApi[];
  onApisChange: (apis: ParsedAsyncApi[]) => void;
}

export const AsyncApiUploader = ({ loadedApis, onApisChange }: AsyncApiUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedApi, setExpandedApi] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newApis: ParsedAsyncApi[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.name.endsWith('.json') && !file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        toast.error(`Archivo no soportado: ${file.name}`, {
          description: 'Solo se permiten archivos .json, .yaml o .yml'
        });
        continue;
      }

      try {
        const content = await file.text();
        
        // Try to parse as AsyncAPI first, then as simple JSON schema
        let parsed = parseAsyncApiSpec(content, file.name);
        
        if (!parsed || parsed.fields.length === 0) {
          parsed = parseSimpleJsonSchema(content, file.name);
        }

        if (parsed && parsed.fields.length > 0) {
          newApis.push(parsed);
          toast.success(`AsyncAPI cargado: ${parsed.name}`, {
            description: `${parsed.fields.length} campos extraídos`
          });
        } else {
          toast.error(`No se encontraron campos en: ${file.name}`, {
            description: 'Verifica que el archivo tenga un esquema válido'
          });
        }
      } catch (error) {
        toast.error(`Error al leer: ${file.name}`);
      }
    }

    if (newApis.length > 0) {
      onApisChange([...loadedApis, ...newApis]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadedApis, onApisChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeApi = useCallback((apiId: string) => {
    onApisChange(loadedApis.filter(api => api.id !== apiId));
    toast.info('AsyncAPI eliminado');
  }, [loadedApis, onApisChange]);

  const toggleExpand = useCallback((apiId: string) => {
    setExpandedApi(prev => prev === apiId ? null : apiId);
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
          isDragOver 
            ? "border-primary bg-primary/10" 
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <Upload className={cn(
          "w-10 h-10 mx-auto mb-3 transition-colors",
          isDragOver ? "text-primary" : "text-muted-foreground"
        )} />
        <p className="text-sm text-foreground font-medium">
          Arrastra archivos AsyncAPI aquí
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          o haz click para seleccionar • .json, .yaml, .yml
        </p>
      </div>

      {/* Loaded APIs List */}
      <AnimatePresence mode="popLayout">
        {loadedApis.map((api) => (
          <motion.div
            key={api.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{api.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    v{api.version} • {api.fields.length} campos • {api.channels.length} canal(es)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleExpand(api.id)}
                  className="h-8 w-8"
                >
                  {expandedApi === api.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeApi(api.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expanded view showing fields */}
            <AnimatePresence>
              {expandedApi === api.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-border/50"
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    Canales: {api.channels.join(', ')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {api.fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between px-3 py-2 rounded bg-muted/30 text-sm"
                      >
                        <code className="text-foreground font-mono text-xs">{field.path}</code>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          {field.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {loadedApis.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No hay AsyncAPIs cargados. Los campos mock se usarán por defecto.
        </p>
      )}
    </div>
  );
};
