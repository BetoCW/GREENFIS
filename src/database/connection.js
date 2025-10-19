import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	server: process.env.DB_SERVER || process.env.DB_SERVER_ALT || 'localhost',
	database: process.env.DB_DATABASE,
	port: Number(process.env.DB_PORT || 1433),
	options: {
		encrypt: false,
		enableArithAbort: true
	}
};

// Export a pool promise to reuse connections
const poolPromise = new sql.ConnectionPool(config)
	.connect()
	.then(pool => {
		console.log('Conectado a SQL Server');
		return pool;
	})
	.catch(err => {
		console.error('DB Connection Failed! Bad Config: ', err);
		throw err;
	});

export { sql, poolPromise };

