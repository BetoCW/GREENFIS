import mysql from 'mysql2/promise';

const DEFAULT_CONFIG = {
    host: 'localhost',
    user: 'root', 
    port: 3306,
    password: 'root',
    database: 'greenfis'
}

const connectionString = process.env.DATABASE_URL ?? DEFAULT_CONFIG;

const pool = mysql.createPool(connectionString);

export class GreenFisModelo{
    //Ver todos los usuarios
    static async getUsuarios (){
        console.log("getUsuarios");

        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios'
        )

        return usuarios
    }

    //metodo para crear usuario
    static async create({ input }) {
        const { nombre, correo, contrasena, sucursal_id, activo, rol } = input;
        
        const [result] = await pool.query(
            `INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, activo, rol) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, correo, contrasena, sucursal_id, activo, rol]
        );
        
        // Obtener el usuario recién creado
        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios WHERE nombre = ?',
            [nombre]
        );
        
        return usuarios[0];
    }
}

//Prueva para ver que se conecta

/*
const sql = mysql.createPool(config);

export async function connectDB() {
    try {
        const connection = await sql.getConnection();
        console.log('✅ Conectado a MySQL');
        connection.release();
    } catch (err) {
        console.log('❌ No se ha podido conectar a MySQL: ', err);
    }
}

export { sql };
*/