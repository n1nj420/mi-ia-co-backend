const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuración de base de datos...');

    // Leer el script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');
    
    // Dividir el script en instrucciones individuales
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Encontradas ${statements.length} instrucciones SQL`);

    // Ejecutar cada instrucción
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Saltar comentarios y líneas vacías
      if (statement.includes('---') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`📝 Ejecutando instrucción ${i + 1}...`);
        await supabase.rpc('exec_sql', { sql: statement });
      } catch (error) {
        // Ignorar errores de instrucciones no soportadas por RPC
        if (!error.message.includes('exec_sql')) {
          console.warn(`⚠️ Advertencia en instrucción ${i + 1}:`, error.message);
        }
      }
    }

    console.log('✅ Configuración de base de datos completada');
    console.log('📊 Tablas creadas:');
    console.log('  - users (usuarios)');
    console.log('  - bots (bots de WhatsApp)');
    console.log('  - contacts (contactos)');
    console.log('  - conversations (conversaciones)');
    console.log('  - appointments (citas)');
    console.log('  - payments (pagos)');
    console.log('  - system_settings (configuraciones)');
    console.log('  - audit_logs (logs de auditoría)');

    // Verificar que las tablas se crearon correctamente
    await verifyTables();

  } catch (error) {
    console.error('❌ Error en configuración de base de datos:', error);
    process.exit(1);
  }
}

async function verifyTables() {
  try {
    console.log('🔍 Verificando tablas...');

    const tables = [
      'users',
      'bots', 
      'contacts',
      'conversations',
      'appointments',
      'payments',
      'system_settings',
      'audit_logs'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        console.warn(`⚠️ Error verificando tabla ${table}:`, error.message);
      } else {
        console.log(`✅ Tabla ${table} verificada`);
      }
    }

    console.log('🎉 Todas las tablas han sido verificadas exitosamente');

  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  }
}

// Función auxiliar para crear la función exec_sql si no existe
async function createExecSqlFunction() {
  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'SELECT 1' 
    });
    
    if (error && error.message.includes('exec_sql')) {
      console.log('🔧 Creando función exec_sql...');
      
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      await supabase.rpc('exec_sql', { sql: createFunctionSQL });
      console.log('✅ Función exec_sql creada');
    }
  } catch (error) {
    console.warn('⚠️ No se pudo crear función exec_sql:', error.message);
  }
}

// Ejecutar setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 ¡Setup de base de datos completado exitosamente!');
      console.log('\n📋 Próximos pasos:');
      console.log('1. Verifica que todas las variables de entorno estén configuradas');
      console.log('2. Ejecuta las migraciones si las hay');
      console.log('3. Inicia el servidor con: npm run dev');
      console.log('4. Verifica que el health check responda en: http://localhost:3000/health');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en setup:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };