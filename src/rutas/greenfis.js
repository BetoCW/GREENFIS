import { Router } from "express";
import { GreenfisControlador } from "../controladores/greenfis.js";

export const crearUsuarioRuta = ({ greenfisModelo }) => {
    const usuarioRuta = Router();

    const greenfisControlador = new GreenfisControlador({ greenfisModelo });

    usuarioRuta.get('/', greenfisControlador.getUsuarios);
    usuarioRuta.post('/', greenfisControlador.create);

    return usuarioRuta;
}