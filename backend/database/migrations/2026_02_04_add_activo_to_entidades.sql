-- Agregar columna activo a la tabla entidades para soft delete
ALTER TABLE entidades
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Crear índice para búsquedas de entidades activas
CREATE INDEX IF NOT EXISTS idx_entidades_activo ON entidades(activo);

-- Comentario
COMMENT ON COLUMN entidades.activo IS 'Indica si la entidad está activa. Se usa para soft delete cuando hay registros asociados.';
