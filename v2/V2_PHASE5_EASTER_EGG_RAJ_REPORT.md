# Phase 5 - Easter egg Raj

## Déclencheur

Saisir `raj` hors d'un formulaire active ou désactive la scène. L'easter egg
reste réservé au bureau, comme dans la V1.

## Comportement migré

- Raj-Pah apparaît et se déplace dans le viewport ;
- il combat des Bouftous, reçoit parfois une contre-attaque et ramasse le butin ;
- il peut repérer et neutraliser Aina, Toom ou Charlie lorsqu'ils sont actifs ;
- Aina lui laisse le Dofus Ivoire et Toom sa NRG 500 ;
- après plusieurs combats, Happios effectue une ronde anti-bot ;
- le carton rouge déclenche le bannissement puis nettoie automatiquement la scène.

## Succès

- `egg_raj` est débloqué lors de la connexion de Raj-Pah ;
- `secret_raj_ban` est débloqué lorsque Happios prononce le bannissement.

## Architecture et nettoyage

Le module `v2/js/events/easterEggs/raj.js` possède son DOM, ses timers et son
état. Les autres easter eggs exposent seulement `isEnabled`, `getElement` et
`deactivate`, ce qui évite de coupler Raj à leurs variables privées. Toute
désactivation annule les promesses en attente, supprime les éléments créés et
restaure `aria-hidden`.

Les animations respectent `prefers-reduced-motion`. La couche reste en
`pointer-events: none` et est masquée sur mobile ou pointeur tactile.

## Vérifications

- 119 tests unitaires réussis, 0 échec ;
- activation et arrêt manuel validés ;
- capture d'un easter egg actif validée par contrat public ;
- interruption d'une ronde Happios et nettoyage des timers validés ;
- syntaxe du module et présence des assets Raj validées ;
- activation visuelle locale validée dans le navigateur intégré.

## Prochaine étape

Migrer Brako. Son interruption de Raj utilisera le contrat public du contrôleur
Raj et débloquera le succès secret `secret_egg_war`.
