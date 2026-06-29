# Pykur Tracker V2 - Phase 5, module 11 : notifications

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation  
**Périmètre :** messages d'action locaux, erreurs et présentation des toasts.

## 1. Comportement V1 conservé

La V2 reprend les règles de notification de la V1 :

- six messages visibles au maximum ;
- fermeture au clic ou au clavier ;
- durée courte, normale ou longue issue des réglages ;
- tailles compacte, normale et large ;
- mode persistant jusqu'à fermeture manuelle ;
- coupure globale de tous les messages visuels ;
- masquage séparé des notifications mineures.

Les sons restent hors de ce module et seront migrés avec le service audio. Aucun son
temporaire ou doublon n'a été ajouté.

## 2. Architecture

`services/notifications.js` normalise les messages et applique les préférences du
profil actif ou les options partagées. Il ne dépend pas du DOM.

`components/toast.js` gère uniquement la file visuelle, les délais, les actions et
la destruction des éléments. Tous les timers sont supprimés avec leur notification.

`notifications.css` contient la présentation responsive et respecte
`prefers-reduced-motion`.

## 3. Intégration

Le service est utilisé par :

- l'ajout et le retrait de runs ;
- le choix d'un donjon et les comportements spéciaux ;
- la création, le renommage, la suppression et le changement de profil ;
- les commandes du chrono et de session ;
- les actions d'historique ;
- les corrections de runs et de monstres ;
- les erreurs remontées par le stockage local.

Le texte d'état du dashboard reste alimenté en parallèle afin de conserver une zone
`aria-live` stable pour les technologies d'assistance.

## 4. Accessibilité et nettoyage

- `role="status"` pour les messages courants ;
- `role="alert"` pour les erreurs ;
- région nommée et annoncée poliment ;
- bouton de fermeture nommé ;
- fermeture possible avec Entrée, Espace ou Échap ;
- aucun élément invisible conservé après fermeture ;
- aucun timer conservé après destruction.

## 5. Vérifications

- 74 tests unitaires réussis, dont 5 dédiés aux notifications ;
- durée et taille bornées ;
- filtrage global et mineur vérifié ;
- paramètres transmis au renderer vérifiés ;
- apparition et fermeture vérifiées dans Chrome headless ;
- aucune erreur JavaScript détectée pendant le parcours ;
- aucun fichier V1 modifié.

Le module Options n'a pas été commencé.
