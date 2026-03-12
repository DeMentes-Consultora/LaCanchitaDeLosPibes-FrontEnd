export const environment = {
  production: false,
  apiUrl: '/api',
  
  // URL del backend en desarrollo mediante proxy de Angular
  backendUrl: '/api',
  
  // Firebase Configuration (si usas Firebase)
  firebaseConfig: {
    apiKey: "AIzaSyBCBx0208IfmpjeHD6hL1oGd8Qp4DcH6Iw",
    authDomain: "lacanchitadelospibes.firebaseapp.com",
    projectId: "lacanchitadelospibes",
    storageBucket: "lacanchitadelospibes.firebasestorage.app",
    messagingSenderId: "196298937978",
    appId: "1:196298937978:web:2d609e7c2dafa807034dc3",
    measurementId: "G-K8PJTQLPG8"
  },
  
  // Configuraciones de desarrollo
  debug: true,
  logLevel: 'debug',
  
  // URLs externas
  googleMapsApiKey: 'your-google-maps-key',
  
  // Configuraciones de email (solo para mostrar info al usuario)
  emailConfig: {
    supportEmail: 'support@lacanchitadelospibes.com',
    adminEmail: 'admin@lacanchitadelospibes.com'
  },
  
  // Configuraciones de la aplicación
  app: {
    name: 'La Canchita de los Pibes',
    version: '1.0.0',
    supportPhone: '+54 9 11 1234-5678'
  }
};
