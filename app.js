const express = require("express")
const bodyParser = require("body-parser")
const session = require("express-session")
const mysql = require ('mysql2/promise')
const cors = require('cors')
require('dotenv').config()


// -----------------------------------------------------------------------------
//Middleware
const app = express()
app.use(cors({
    origin: 'https://cine-freak.vercel.app',
    credentials: true
}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(express.static("Front"))
app.set('trust proxy', 1)
app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none'
    }
}))


// -----------------------------------------------------------------------------
//Configuracion BBDD
const db = {
    host: 'mysql-base1cine.alwaysdata.net',
    user: 'base1cine_admin',
    password: 'contrasena_1234',
    database: 'base1cine_cine'
}



// -----------------------------------------------------------------------------
//Rutas generales
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
//Registrar Usuarios
app.post('/registrar_usuario', async(req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {nombre, correo, contrasena, rol} = req.body

        const [existencia] = await conect.execute('SELECT Nombre, Correo, Contraseña, Rol FROM usuario WHERE Correo = ?', [correo]) 

        if(existencia.length > 0){
            return res.status(200).json({
                success: false,
                message: 'Ya existe'
            })
        }

        await conect.execute("INSERT INTO Usuario (Nombre, Correo, Contraseña, Rol) VALUES(?, ?, ?, ?)", [nombre, correo, contrasena, rol])

        return res.status(201).json({
            success: true,
            message: 'Usuario Registrado',
            data: {nombre, correo, contrasena, rol}
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo registrar usuario'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Iniciar Sesion
app.post('/iniciar_sesion', async(req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {correo, contrasena} = req.body

        const [validar] = await conect.execute('SELECT Id_usuario, Nombre, Correo, Contraseña, Rol FROM usuario WHERE Correo = ? AND Contraseña = ?', [correo, contrasena])

        if(!validar.length > 0){
            return res.status(200).json({
                success: false,
                message: 'El usuario no existe'
            })
        }

        //Guardar datos del usuario en la sesion
        const usuario = validar[0]

        //Necesario para obtener los datos del usuario despues
        req.session.usuario = {
            id:usuario.Id_usuario,
            nombre:usuario.Nombre,
            correo:usuario.Correo,
            rol:usuario.Rol
        }

        res.status(200).json({
            success: true,
            message: 'Inicio de sesion exitoso',
            data: {
                id:usuario.Id_usuario,
                nombre:usuario.Nombre,
                correo:usuario.Correo,
                rol:usuario.Rol
            }
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo iniciar sesion'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Informacion usuario
app.get('/info_perfil', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        if(req.session.usuario){
            res.status(200).json({ 
                success: true,
                usuario: req.session.usuario 
            });
        }
        else{
            res.status(404).json({
                success: false,
                message: 'No hay inicio de sesion'
            })
        }
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener informacion del usuario'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Cerrar sesion
app.post('/cerrar_sesion', async(req, res) => {
    req.session.destroy(err => {
        if(err){
            console.log(err)
            res.status(500).json({
                success: false,
                message: 'No se pudo cerrar sesion'
            })
        }
        else{
            res.status(201).json({
                success: true,
                message: 'Sesion cerrada'
            })
        }
    })
})


// -----------------------------------------------------------------------------
//Obtener todos los centros comerciales
app.get('/centros_comerciales', async(req, res) =>{
    let conect
    try{
        conect = await mysql.createConnection(db)
        
        const [info] = await conect.execute('SELECT * FROM centro_comercial')

        res.status(200).json({
            success: true,
            data: info
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener los centros comerciales'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Filtro
app.post('/filtrar_funciones', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {centro_comercial} = req.body

        const [funciones] = await conect.execute(`SELECT funcion.Id_funcion, funcion.Titulo, funcion.Sinopsis, funcion.Portada, funcion.Hora, centro_comercial.Id_c_comercial, centro_comercial.Nombre FROM funcion
        INNER JOIN funcion_centro_comercial ON funcion.Id_funcion=funcion_centro_comercial.FuncionId_funcion
        INNER JOIN centro_comercial ON funcion_centro_comercial.Centro_ComercialId_c_comercial=centro_comercial.Id_c_comercial 
        WHERE centro_comercial.Id_c_comercial = ?
        ORDER BY funcion.Hora ASC`, [centro_comercial])

        if(funciones.length > 0){
            return res.status(200).json({
                success: true, 
                data: funciones
            })
        }
        else{
            return res.status(404).json({
                success: true, 
                message: 'No hay funciones'
            })
        }
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo filtrar'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Obtener sillas
app.get('/sillas', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const [sillas] = await conect.execute('SELECT Id_sillas, Fila, Columna FROM sillas')

        res.status(200).json({
            success: true,
            data: sillas
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener sillas'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Obtener info de las sillas de una funcion
app.post('/sillas_funcion_info', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {Id_funcion} = req.body

        const [sillas] = await conect.execute(`SELECT sillas.Id_sillas, sillas.Fila, sillas.Columna, usuario_sillas.FuncionId_funcion, usuario_sillas.UsuarioId_usuario
        FROM sillas
        INNER JOIN usuario_sillas ON sillas.Id_sillas = usuario_sillas.SillasId_sillas
        WHERE usuario_sillas.FuncionId_funcion = ?`, [Id_funcion])

        res.status(200).json({
            success: true,
            data: sillas
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener informacion de las sillas'
        })
    }
    finally{
        if (conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Rutas administrador
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
//Crear funcion
app.post('/crear_funcion', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)
        
        const {titulo, sinopsis, portada, centro_comercial, hora} = req.body

        const [crear] = await conect.execute('INSERT INTO funcion (Titulo, Sinopsis, Portada, Hora) VALUES (?, ?, ?, ?)', [titulo, sinopsis, portada, hora])

        //Verifica que si se inserto en la base de datos
        if(crear.insertId){
            await conect.execute('INSERT INTO funcion_centro_comercial (FuncionId_funcion, Centro_ComercialId_c_comercial) VALUES (?, ?)', [crear.insertId, centro_comercial])
        }
        
        res.status(202).json({
            success: true,
            message: 'Funcion creada',
            data: {titulo, sinopsis, portada, centro_comercial, hora}
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo crear la funcion'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//listar todas las funciones
app.get('/lista_todas_funciones', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const [funciones] = await conect.execute(`SELECT funcion.Id_funcion, funcion.Titulo, funcion.Sinopsis, funcion.Portada, funcion.Hora, centro_comercial.Id_c_comercial, centro_comercial.Nombre FROM funcion
        INNER JOIN funcion_centro_comercial ON funcion.Id_funcion=funcion_centro_comercial.FuncionId_funcion
        INNER JOIN centro_comercial ON funcion_centro_comercial.Centro_ComercialId_c_comercial=centro_comercial.Id_c_comercial 
        ORDER BY funcion.Hora ASC`)

        res.status(200).json({
            success: true,
            message: 'Funciones encontradas',
            data: funciones
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo listar todas las funciones'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


//listar funcion por ID
app.post('/funcion_id', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {id_funcion} = req.body

        const [funciones] = await conect.execute(`SELECT funcion.Id_funcion, funcion.Titulo, funcion.Sinopsis, funcion.Portada, funcion.Hora, centro_comercial.Id_c_comercial, centro_comercial.Nombre FROM funcion
        INNER JOIN funcion_centro_comercial ON funcion.Id_funcion=funcion_centro_comercial.FuncionId_funcion
        INNER JOIN centro_comercial ON funcion_centro_comercial.Centro_ComercialId_c_comercial=centro_comercial.Id_c_comercial 
        WHERE funcion.Id_funcion = ?`, [id_funcion])

        res.status(200).json({
            success: true,
            data: funciones
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener la funcion'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Editar funcion
app.put('/editar_funcion', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {id_funcion, titulo, sinopsis, portada, centro_comercial, hora} = req.body

        const [exitecia] = await conect.execute('SELECT * FROM funcion WHERE Id_funcion = ?', [id_funcion])

        if(!exitecia.length > 0){
            return res.status(400).json({
                success: true,
                message: 'No se encontro la funcion'
            })
        }

        const [editar] = await conect.execute(`UPDATE funcion 
        SET Titulo = ?, Sinopsis = ?, Portada = ?, Hora = ?
        WHERE funcion.Id_funcion = ?`, [titulo, sinopsis, portada, hora, id_funcion])

        //Similar al insertId pero especificamente para update
        if(editar.affectedRows > 0){
            await conect.execute(`UPDATE funcion_centro_comercial
            SET Centro_ComercialId_c_comercial = ?
            WHERE funcion_centro_comercial.FuncionId_funcion = ?`, [centro_comercial, id_funcion])
        }

        res.status(200).json({
            success: true,
            message: 'Funcion actualizada',
            data: {
                id_funcion, titulo, sinopsis, portada, centro_comercial, hora
            }
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo actualizar la funcion'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//Eliminar funcion
app.post('/eliminar_funcion', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        const {id_funcion} = req.body

        const [buscar] = await conect.execute('SELECT * FROM funcion WHERE Id_funcion = ?', [id_funcion])

        if(buscar.length === 0){
            return res.status(200).json({
                success: false,
                message: 'No se encontro la funcion'
            })
        }

        await conect.execute('DELETE FROM funcion WHERE Id_funcion = ?', [id_funcion])

        res.status(200).json({
            success: true,
            message: 'Funcion eliminada'
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo eliminar la funcion'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})



// -----------------------------------------------------------------------------
//Rutas Usuario
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
//Reservar Funcion
app.post('/reservar', async (req, res) => {
  let conect
  try {
    conect = await mysql.createConnection(db)

    if (!req.session.usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'No hay inicio de sesion' 
    })
    }

    const precioPorSilla = 10000

    const { id_funcion, ids_sillas } = req.body
    const id_usuario = req.session.usuario.id

    console.log('Datos recibidos:', { ids_sillas, id_usuario, id_funcion })

    // Verificar si alguna de las sillas ya está reservada
    const [existentes] = await conect.query(
      'SELECT * FROM usuario_sillas WHERE FuncionId_funcion = ? AND SillasId_sillas IN (?)',
      [id_funcion, ids_sillas]
    )

    if (existentes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Una o más sillas ya están reservadas'
      })
    }

    const total = ids_sillas.length * precioPorSilla


    // Insertar todas las reservas
    const values = ids_sillas.map(id_silla => [id_usuario, id_silla, id_funcion])
    await conect.query(
      'INSERT INTO Usuario_Sillas (UsuarioId_usuario, SillasId_sillas, FuncionId_funcion) VALUES ?',
      [values]
    )

    res.status(200).json({
        success: true, 
        total: total,
        cantidad: ids_sillas.length,
        message: 'Reservas hechas' 
    })
  } catch (error) {
    console.error('Error: ' + error)
    return res.status(500).json({ 
        success: false,
        message: 'No se pudo reservar' 
    })
  } finally {
    if (conect) await conect.end()
  }
})


// -----------------------------------------------------------------------------
//Listar reserva de un usuario especifico
app.get('/reservas_usuario', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        if(!req.session.usuario){
            return res.status(401).json({
                success: false,
                message: 'No hay inicio de sesion'
            })
        }

        const id_usuario = req.session.usuario.id

        const [reservas] = await conect.execute(`
        SELECT funcion.Id_funcion, funcion.Titulo, funcion.Sinopsis, funcion.Portada, centro_comercial.Nombre, funcion.Hora 
        FROM usuario
        INNER JOIN usuario_sillas ON usuario.Id_usuario = usuario_sillas.UsuarioId_usuario
        INNER JOIN funcion ON usuario_sillas.FuncionId_funcion = funcion.Id_funcion
        INNER JOIN funcion_centro_comercial ON funcion.Id_funcion = funcion_centro_comercial.FuncionId_funcion
        INNER JOIN centro_comercial ON funcion_centro_comercial.Centro_ComercialId_c_comercial = centro_comercial.Id_c_comercial
        WHERE usuario.Id_usuario = ?
        GROUP BY funcion.Id_funcion, funcion.Titulo, funcion.Sinopsis, funcion.Portada, centro_comercial.Nombre, funcion.Hora`, [id_usuario])
        
        res.status(200).json({
            success: true,
            data: reservas
        })
    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo obtener las reservas del usuario'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
//cancelar funcion
app.post('/cancelar_funcion_usuario', async (req, res) => {
    let conect
    try{
        conect = await mysql.createConnection(db)

        if(!req.session.usuario){
            return res.status(401).json({
                success: false,
                message: 'No hay inicio de sesion'
            })
        }

        const {id_funcion} = req.body
        const id_usuario = req.session.usuario.id

        const [buscar] = await conect.execute('SELECT * FROM usuario_sillas WHERE FuncionId_funcion = ? AND UsuarioId_usuario = ?', [id_funcion, id_usuario])

        if(buscar.length === 0){
            return res.status(200).json({
                success: false,
                message: 'No se encontro la reserva'
            })
        }

        await conect.execute('DELETE FROM usuario_sillas WHERE FuncionId_funcion = ? AND UsuarioId_usuario = ?', [id_funcion, id_usuario])

        res.status(200).json({
            success: true,
            message: 'Funcion eliminada'
        })

    }
    catch(error){
        console.error('Error: ' + error)
        return res.status(500).json({
            success: false, 
            message: 'No se pudo eliminar funcion'
        })
    }
    finally{
        if(conect) await conect.end()
    }
})


// -----------------------------------------------------------------------------
module.exports = app;
