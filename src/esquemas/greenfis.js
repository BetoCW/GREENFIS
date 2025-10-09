import z from 'zod'

const usuariosEsquema = z.object({
    nombre: z.string()
        .min(1, "El nombre es requerido")
        .max(50, "El nombre no puede exceder 50 caracteres"),
    
    correo: z.string()
        .email("El correo debe ser válido")
        .max(100, "El correo no puede exceder 100 caracteres"),
    
    contrasena: z.string()
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .max(255, "La contraseña no puede exceder 255 caracteres"),
    
    sucursal_id: z.number()
        .int("El ID de sucursal debe ser un número entero")
        .positive("El ID de sucursal debe ser positivo"),
    
    activo: z.number().int().min(0).max(1).default(1),
    
    rol: z.enum(['gerente', 'almacenista', 'vendedor'], {
        errorMap: () => ({ message: "El rol debe ser: gerente, almacenista o vendedor" })
    })
})

export function validarUsuario (input){
    return usuariosEsquema.safeParse(input);
}

export function validarUsuarioParcial(input){
    return usuariosEsquema.partial().safeParse(input);
}