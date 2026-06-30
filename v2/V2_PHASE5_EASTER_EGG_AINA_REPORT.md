# V2 - Phase 5 - Easter egg 4 : Aina

## Déclencheur

Saisir `aina` hors d'un champ de formulaire active ou désactive la scène. Le code
est géré par le routeur commun des séquences secrètes et ne déclenche aucun
raccourci du tracker pendant sa saisie.

## État

- l'état visuel est temporaire et n'est pas restauré après rechargement ;
- le succès `egg_aina` est enregistré lors de la première activation ;
- retaper `aina` masque Aina et le Dofus Ivoire.

## DOM et interaction

- `#ainaOverlay` contient Aina et le Dofus Ivoire ;
- seul le Dofus est interactif, le reste de la scène ne bloque aucun clic ;
- chaque tentative de récupération affiche une réaction historique ;
- les réactions sont limitées à une toutes les 900 ms ;
- l'état ARIA de l'overlay suit sa visibilité réelle ;
- les animations sont désactivées lorsque le mouvement réduit est demandé.

## Son

Une tentative valide joue `reset_soft.wav` via le service audio V2. Le son respecte
donc le mute global et le volume du tracker et ne se superpose pas au précédent.

## Nettoyage

Le contrôleur retire le listener du Dofus et enlève toutes les classes temporaires
de l'overlay et du `body` lors de sa destruction.

## Vérifications

- activation et désactivation par `aina` ;
- succès `egg_aina` transmis au module Succès ;
- cooldown des clics testé à 900 ms ;
- son, réactions et nettoyage vérifiés ;
- 116 tests unitaires réussis, 0 échec ;
- syntaxe, assets et ressources HTTP locales vérifiés ;
- aucun fichier V1 modifié par ce lot.

## Prochaine migration proposée

Migrer l'easter egg Raj de manière isolée. Comme il interagit avec plusieurs autres
easter eggs, son contrat devra être découpé et testé avec une attention particulière.
