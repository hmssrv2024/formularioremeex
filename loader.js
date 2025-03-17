// Sistema AJAX para evitar que el usuario vea las URLs y use los controles de navegación
// loader.js - Para Remeex VISA

// Variable para rastrear si estamos redirigiendo intencionalmente
let isRedirecting = false;

// Función principal para cargar una página mediante AJAX
function cargarPagina(nombrePagina) {
  // Mostrar la pantalla de carga
  mostrarCargando();
  
  // Guardar la página actual en sessionStorage
  sessionStorage.setItem('paginaActual', nombrePagina);
  
  // Realizar la solicitud AJAX
  const xhr = new XMLHttpRequest();
  xhr.open('GET', nombrePagina + '.html', true);
  
  // Cuando la solicitud se complete
  xhr.onload = function() {
    if (this.status === 200) {
      // Ocultar contenido actual con fade out
      const contenedor = document.getElementById('contenedor-dinamico');
      contenedor.style.opacity = '0';
      
      // Después de la transición, insertar nuevo contenido
      setTimeout(function() {
        // Insertar el contenido recibido
        contenedor.innerHTML = xhr.responseText;
        
        // Ejecutar los scripts dentro del contenido cargado
        ejecutarScripts();
        
        // Mostrar el nuevo contenido con fade in
        setTimeout(function() {
          contenedor.style.opacity = '1';
          // Ocultar pantalla de carga
          ocultarCargando();
        }, 50);
      }, 300);
    } else {
      // Manejar errores
      console.error(`Error al cargar ${nombrePagina}.html: ${this.status}`);
      document.getElementById('contenedor-dinamico').innerHTML = `
        <div style="padding: 30px; text-align: center; margin: 20px auto; max-width: 500px; background: #fff3f3; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
          <h3 style="color: #dc2626; margin-bottom: 15px;"><i class="fas fa-exclamation-triangle"></i> Error al cargar el contenido</h3>
          <p>No se pudo cargar la página solicitada. Por favor, inténtalo de nuevo.</p>
          <button onclick="cargarPagina('index_remeex_content')" style="margin-top: 15px; padding: 10px 20px; background: #1a1f71; color: white; border: none; border-radius: 5px; cursor: pointer;">Volver al inicio</button>
        </div>
      `;
      ocultarCargando();
    }
  };
  
  // En caso de error de red
  xhr.onerror = function() {
    console.error('Error de red al intentar cargar el contenido');
    document.getElementById('contenedor-dinamico').innerHTML = `
      <div style="padding: 30px; text-align: center; margin: 20px auto; max-width: 500px; background: #fff3f3; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <h3 style="color: #dc2626; margin-bottom: 15px;"><i class="fas fa-wifi"></i> Error de conexión</h3>
        <p>Verifica tu conexión a internet e inténtalo nuevamente.</p>
        <button onclick="cargarPagina('index_remeex_content')" style="margin-top: 15px; padding: 10px 20px; background: #1a1f71; color: white; border: none; border-radius: 5px; cursor: pointer;">Volver al inicio</button>
      </div>
    `;
    ocultarCargando();
  };
  
  xhr.send();
}

// Función para mostrar la pantalla de carga
function mostrarCargando() {
  document.getElementById('cargando').style.display = 'flex';
}

// Función para ocultar la pantalla de carga
function ocultarCargando() {
  document.getElementById('cargando').style.display = 'none';
}

// Función para ejecutar scripts dentro del contenido cargado
function ejecutarScripts() {
  const contenedor = document.getElementById('contenedor-dinamico');
  const scripts = contenedor.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const scriptActual = scripts[i];
    const nuevoScript = document.createElement('script');
    
    // Copiar todos los atributos
    const atributos = scriptActual.attributes;
    for (let j = 0; j < atributos.length; j++) {
      const attr = atributos[j];
      nuevoScript.setAttribute(attr.name, attr.value);
    }
    
    // Copiar el contenido del script
    nuevoScript.innerHTML = scriptActual.innerHTML;
    
    // Reemplazar el script original con el nuevo (ejecutable)
    scriptActual.parentNode.replaceChild(nuevoScript, scriptActual);
  }
}

// Interceptar todos los clics en la página para manejar enlaces
document.addEventListener('click', function(e) {
  // Buscar si el clic fue en un enlace o dentro de un enlace
  let elemento = e.target;
  while (elemento && elemento.tagName !== 'A') {
    elemento = elemento.parentElement;
  }
  
  // Si encontramos un enlace
  if (elemento && elemento.tagName === 'A') {
    const href = elemento.getAttribute('href');
    
    // Solo interceptar enlaces internos (ignorar externos o con # o javascript:)
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && 
        !href.startsWith('http://') && !href.startsWith('https://')) {
      
      // Prevenir la navegación normal
      e.preventDefault();
      
      // Extraer el nombre de la página (sin .html)
      const nombrePagina = href.replace('.html', '');
      
      // Cargar la página usando AJAX
      cargarPagina(nombrePagina);
    }
  }
});

// Prevenir el uso del botón atrás/adelante
window.addEventListener('load', function() {
  history.pushState(null, "", window.location.href);
  
  window.addEventListener('popstate', function() {
    history.pushState(null, "", window.location.href);
    
    // Opcionalmente, cargar la página guardada en sessionStorage
    const paginaGuardada = sessionStorage.getItem('paginaActual') || 'index_remeex_content';
    cargarPagina(paginaGuardada);
  });
  
  // Cargar la página inicial o la guardada en sessionStorage
  const paginaInicial = sessionStorage.getItem('paginaActual') || 'index_remeex_content';
  cargarPagina(paginaInicial);
});

// Función para manejar redirecciones
// Usar esta función en lugar de window.location.href = "página.html"
function redirigir(nombrePagina) {
  isRedirecting = true;
  cargarPagina(nombrePagina);
}

// Exponer funciones globalmente
window.cargarPagina = cargarPagina;
window.redirigir = redirigir;
window.mostrarCargando = mostrarCargando;
window.ocultarCargando = ocultarCargando;
