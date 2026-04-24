export const environment = {
  production: false,
  apiUrl: '/api',
  
  // URL del backend en desarrollo mediante proxy de Angular
  backendUrl: '/api',
  
  // Firebase Configuration (si usas Firebase)
  firebaseConfig: {
    apiKey: "AIzaSyAOjtAOxkulojiEvqbsZMpi3qX46UvqCGo",
    authDomain: "lacanchitadelospibes-39fa0.firebaseapp.com",
    projectId: "lacanchitadelospibes-39fa0",
    storageBucket: "lacanchitadelospibes-39fa0.firebasestorage.app",
    messagingSenderId: "72649364860",
    appId: "1:72649364860:web:8493ae21d30d5ff76f40f9",
    measurementId: "G-6ECTEP3WL3"
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
