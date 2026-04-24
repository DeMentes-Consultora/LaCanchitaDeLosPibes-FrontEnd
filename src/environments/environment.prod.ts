export const environment = {
  production: true,
  apiUrl: '/api',
  backendUrl: '/api',
  
  // Firebase Configuration (producción)
  firebaseConfig: {
    apiKey: "AIzaSyAOjtAOxkulojiEvqbsZMpi3qX46UvqCGo",
    authDomain: "lacanchitadelospibes-39fa0.firebaseapp.com",
    projectId: "lacanchitadelospibes-39fa0",
    storageBucket: "lacanchitadelospibes-39fa0.firebasestorage.app",
    messagingSenderId: "72649364860",
    appId: "1:72649364860:web:8493ae21d30d5ff76f40f9",
    measurementId: "G-6ECTEP3WL3"
  },
  
  // Configuraciones de producción
  debug: false,
  logLevel: 'error',
  
  // URLs externas (producción)
  googleMapsApiKey: 'your-production-google-maps-key',
  
  // Configuraciones de email
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
