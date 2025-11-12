-- Script SQL para crear tablas de MI-IA.CO en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled')),
  subscription_tier TEXT DEFAULT 'tier1' CHECK (subscription_tier IN ('tier1', 'tier2', 'tier3')),
  wompi_subscription_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Tabla de bots
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('barberia', 'restaurante', 'tienda', 'consultoria', 'salud', 'educacion', 'servicios', 'otro')),
  description TEXT,
  config_json JSONB DEFAULT '{}',
  n8n_workflow_id TEXT,
  whatsapp_number TEXT NOT NULL,
  status TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para bots
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_bots_business_type ON bots(business_type);

-- Tabla de contactos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'customer', 'inactive')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, phone)
);

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_bot_id ON contacts(bot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction);

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT,
  intent TEXT DEFAULT 'general' CHECK (intent IN ('agendar', 'consulta', 'venta', 'cancelar', 'informacion', 'saludo', 'despedida', 'queja', 'general')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON conversations(intent);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Tabla de citas/appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  google_calendar_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_bot_id ON appointments(bot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Tabla de pagos/payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wompi_transaction_id TEXT UNIQUE NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'COP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'refunded')),
  payment_method TEXT,
  customer_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_wompi_transaction_id ON payments(wompi_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs/audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Funciones auxiliares
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar last_interaction en contacts
CREATE OR REPLACE FUNCTION update_contact_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE contacts 
    SET last_interaction = NEW.created_at 
    WHERE id = NEW.contact_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar last_interaction
CREATE TRIGGER update_contact_interaction AFTER INSERT ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_contact_last_interaction();

-- Función para registrar logs de auditoría
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        jsonb_build_object(
            'old_data', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END,
            'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END
        )
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers de auditoría (opcional - descomentar si se desea logging completo)
-- CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users 
--     FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- CREATE TRIGGER audit_bots AFTER INSERT OR UPDATE OR DELETE ON bots 
--     FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE OR DELETE ON contacts 
--     FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Vistas útiles
CREATE OR REPLACE VIEW bot_analytics AS
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.business_type,
    b.status,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT a.id) as total_appointments,
    MAX(conv.created_at) as last_conversation,
    MAX(c.created_at) as last_contact
FROM bots b
LEFT JOIN contacts c ON b.id = c.bot_id
LEFT JOIN conversations conv ON b.id = conv.bot_id
LEFT JOIN appointments a ON b.id = a.bot_id
GROUP BY b.id, b.name, b.business_type, b.status;

CREATE OR REPLACE VIEW contact_analytics AS
SELECT 
    c.id as contact_id,
    c.phone,
    c.name,
    c.status,
    b.name as bot_name,
    COUNT(conv.id) as total_conversations,
    MAX(conv.created_at) as last_interaction,
    array_agg(DISTINCT conv.intent) as intents
FROM contacts c
LEFT JOIN bots b ON c.bot_id = b.id
LEFT JOIN conversations conv ON c.id = conv.contact_id
GROUP BY c.id, c.phone, c.name, c.status, b.name;

-- Configuraciones iniciales del sistema
INSERT INTO system_settings (key, value, description) VALUES
('app_name', '"MI-IA.CO"', 'Nombre de la aplicación'),
('app_version', '"1.0.0"', 'Versión de la aplicación'),
('default_subscription_price', '80000', 'Precio por defecto de suscripción en COP'),
('trial_days', '7', 'Días de prueba gratuitos'),
('max_bots_per_user', '10', 'Máximo de bots por usuario'),
('whatsapp_rate_limit', '100', 'Límite de mensajes WhatsApp por minuto'),
('deepseek_api_quota', '1000', 'Cuota diaria de llamadas a DeepSeek API');

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Usuarios registrados en la plataforma';
COMMENT ON TABLE bots IS 'Bots de WhatsApp configurados por los usuarios';
COMMENT ON TABLE contacts IS 'Contactos/Clientes de los bots';
COMMENT ON TABLE conversations IS 'Historial de conversaciones entre bots y contactos';
COMMENT ON TABLE appointments IS 'Citas y reservas gestionadas por los bots';
COMMENT ON TABLE payments IS 'Registro de pagos y transacciones';
COMMENT ON TABLE audit_logs IS 'Log de auditoría para tracking de cambios';

-- Permisos (ajustar según necesidades de seguridad)
-- Estos permisos son básicos y deben ser ajustados según las políticas de seguridad

-- Permitir lectura pública en algunas tablas (si es necesario)
-- GRANT SELECT ON bots TO anon;
-- GRANT SELECT ON system_settings TO anon;

-- Permitir operaciones CRUD a usuarios autenticados
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Actualizar updated_at en todas las tablas que lo necesiten
UPDATE users SET updated_at = NOW();
UPDATE bots SET updated_at = NOW();
UPDATE contacts SET updated_at = NOW();
UPDATE appointments SET updated_at = NOW();
UPDATE payments SET updated_at = NOW();
UPDATE system_settings SET updated_at = NOW();

-- Mensaje de confirmación
SELECT 'Tablas de MI-IA.CO creadas exitosamente' as status;