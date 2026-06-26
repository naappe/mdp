// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_CONFIG = {
    url: 'https://espezmdpkoixnfchomqb.supabase.co',
    publishableKey: 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1'
};

// ============================================
// ADMIN CONFIGURATION
// ============================================

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// ============================================
// EXPOSE TO GLOBAL SCOPE (REQUIRED!)
// ============================================
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.ADMIN_USERNAME = ADMIN_USERNAME;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;

console.log('✅ config.js loaded');
console.log('🔐 Login with: admin / admin123');