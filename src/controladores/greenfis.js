import { validarUsuario, validarUsuarioParcial } from "../esquemas/greenfis.js";

export class GreenfisControlador {
    constructor({ greenfisModelo }) {
        this.greenfisModelo = greenfisModelo;
    }

    getUsuarios = async (req, res) => {
        try {
            // Opción A: Sin filtro (si quieres mantener simple)
            const usuarios = await this.greenfisModelo.getUsuarios();
            res.json(usuarios);

            // Opción B: Con filtro (necesitas modificar el modelo)
            // const { nombre } = req.query;
            // const usuarios = await this.greenfisModelo.getUsuarios({ nombre });
            // res.json(usuarios);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener usuarios" });
        }
    }

    create = async (req, res) => {
        const result = validarUsuario(req.body)

        if (!result.success) {
            // 422 Unprocessable Entity
            return res.status(400).json({ error: JSON.parse(result.error.message) })
        }

        const nuevoUsuario = await this.greenfisModelo.create({ input: result.data })

        res.status(201).json(nuevoUsuario)
    }
}