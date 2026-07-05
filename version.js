// Définition de la version actuelle de l'application
const APP_VERSION = "v1.0.8"; 

// Fonction qui crée et affiche le badge de version en bas à droite
function displayVersionBadge() {
    const badge = document.createElement('div');
    
    // Style CSS appliqué directement en JavaScript pour éviter de toucher au style.css
    badge.style.position = 'fixed';
    badge.style.bottom = '15px';
    badge.style.right = '15px';
    badge.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    badge.style.color = 'var(--text-grey)';
    badge.style.padding = '5px 10px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '0.75rem';
    badge.style.fontFamily = "'Segoe UI', sans-serif";
    badge.style.zIndex = '9999'; // Pour être sûr qu'il soit au-dessus de l'arrière-plan
    badge.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    badge.style.pointerEvents = 'none'; // Pour ne pas gêner les clics en bas de page
    
    badge.innerText = `Lyrics Original ${APP_VERSION}`;
    
    document.body.appendChild(badge);
}

// Lancement automatique dès que la page est chargée
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayVersionBadge);
} else {
    displayVersionBadge();
}
