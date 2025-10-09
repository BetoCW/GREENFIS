import sql from 'mssql';

const config = {
    user: 'sa',
    password: 'root',
    server: 'VICTOR',
    database: 'GreenFis',
    port: '1433',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
};

export async function connectDB() {
    try {
        await sql.connect(config);
        console.log('✅ Conectado a SQL Server');
    } catch (err) {
        console.error('❌ Error de conexión:', err);
    }
}

export { sql };