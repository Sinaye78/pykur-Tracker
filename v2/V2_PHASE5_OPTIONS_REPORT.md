# Pykur Tracker V2 - Phase 5, module 12 : options et raccourcis

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation  
**Périmètre :** réglages locaux et partagés, présentation et raccourcis clavier.

## 1. Centre Options

Le bouton Options ouvre désormais une interface fonctionnelle composée de sept
catégories :

- Apparence ;
- Interface ;
- Chrono ;
- Notifications ;
- Raccourcis ;
- Liens profils ;
- Accessibilité.

La recherche filtre les catégories et les réglages en temps réel. Une recherche vide
restaure la navigation normale. Tous les champs possèdent un libellé accessible.

## 2. Réglages appliqués

Les préférences suivantes agissent immédiatement et persistent après rechargement :

- mode nuit, animations, infobulles et intensité visuelle ;
- opacité, mode dashboard et mode performance ;
- style du chrono, dixièmes, estimation et automatisations ;
- son global et volume ;
- taille, durée, filtrage et persistance des notifications ;
- contraste, saturation et taille de police.

Les préférences des événements, ambiances et HUD restent conservées dans le store.
Leur moteur sera branché dans leurs modules respectifs.

## 3. Partage entre profils

Les options peuvent rester locales ou devenir communes à tous les profils. Lors de
l'activation du partage, les réglages du profil actif deviennent la référence et sont
copiés dans chaque profil.

La galerie partagée fusionne les archives locales sans doublon et respecte les
tombstones de suppression. Aucun profil ou historique n'est modifié.

## 4. Raccourcis

Les raccourcis configurables de la V1 sont conservés. Le contrôleur :

- ignore les saisies dans les champs et listes ;
- détecte les conflits ;
- accepte Échap pour annuler et Suppr pour désactiver ;
- normalise Ctrl, Alt, Maj et les touches imprimables ;
- traite correctement la touche `+` sur les claviers où elle nécessite Maj ;
- déclenche uniquement les modules déjà migrés.

Les touches destinées à la galerie, à l'aide et à la détection sont conservées dans
les données et seront actives lors de la migration de ces modules.

## 5. Page HTML de test

`v2/index.html` charge maintenant tous les modules migrés : profils, progression,
runs, monstres, projection, chrono, session, historique, statistiques,
notifications, options et raccourcis.

Elle est accessible localement à l'adresse :

`http://127.0.0.1:8766/v2/index.html`

## 6. Vérifications

- 80 tests unitaires réussis ;
- création d'un profil depuis un stockage vide ;
- recherche `notification` limitée à la bonne catégorie ;
- mode nuit appliqué puis conservé après rechargement ;
- `+` ajoute un run et `O` ouvre les Options ;
- test à 1280×720 et 390×844 ;
- aucun overflow horizontal ;
- aucune erreur JavaScript ou ressource 404 ;
- aucun fichier V1 modifié par ce module.

Le module Import / Export n'a pas été commencé.
