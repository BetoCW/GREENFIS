import express, { json } from 'express'
import { crearUsuarioRuta } from './rutas/greenfis.js';
import { corsMiddleware } from './middlewares/cors.js';

export const crearApp = ({ greenfisModelo }) => {
  const app = express();
  app.use(json());
  app.use(corsMiddleware());
  app.disable('x-powered-by');

  app.use('/', crearUsuarioRuta({ greenfisModelo }))

  /*
  //Conectar la BD al iniciar
  connectDB();
  
  //Ejemplo de ruta para obtener datos
  app.get('/usuarios', async (req, res) => {
    try {
      const [rows] = await sql.query('SELECT * FROM usuarios');
      res.json(rows);
    } catch (err) {
      res.status(500).send('Error en el servidor');
    }
  });
  */

  const PORT = process.env.PORT ?? 3000

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`)
  })

}