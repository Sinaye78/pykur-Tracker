# Phase 5 - Easter egg Alhass

## Périmètre migré

- commande secrète `alhass` ;
- présence visuelle, voile d'observation et aura animée ;
- chargement différé de l'asset lourd au premier déclenchement ;
- déblocage du succès `egg_alhass` ;
- réactions aux runs, aux paliers et aux limites de donjons ;
- cooldown de 45 secondes et probabilité de réaction de 16 % conservés ;
- neutralisation d'Alhass par Raj-Pah ;
- nettoyage des classes, états et abonnements.

## Architecture

Le contrôleur isolé `js/events/easterEggs/alhass.js` ne dépend pas du tableau de bord. Celui-ci publie seulement ses événements de run et de garde. Le contrôleur principal traduit ensuite les passages de paliers en réactions Alhass.

## Vérifications

- 123 tests unitaires réussis, 0 échec ;
- syntaxe des modules validée ;
- asset Alhass présent et chargé uniquement à l'activation ;
- rendu desktop validé à 1269 x 912 ;
- rendu mobile validé à 390 x 844 ;
- aucun overflow horizontal détecté ;
- aucun fichier V1 inclus dans cette migration.

## Test manuel

1. Saisir `alhass` hors d'un champ de formulaire.
2. Ajouter des runs et franchir un palier pour observer ses réactions.
3. Atteindre une limite de donjons pour provoquer une réaction de garde.
4. Activer Raj pendant qu'Alhass observe pour vérifier sa neutralisation.

