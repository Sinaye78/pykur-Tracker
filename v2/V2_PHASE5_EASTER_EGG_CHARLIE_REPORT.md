# V2 - Phase 5 - Easter egg 2 : Charlie

## Déclencheur

Saisir `charlie` au clavier en dehors d'un champ de formulaire active ou désactive
l'easter egg. La séquence est interceptée avant les raccourcis du tracker afin
d'éviter l'ouverture involontaire d'autres panneaux pendant sa saisie.

## État

- l'état visuel actif est temporaire et n'est pas restauré après rechargement ;
- le succès `egg_charlie` est enregistré lors de la première activation ;
- retaper `charlie` désactive proprement l'effet.

## DOM et animation

- un unique élément `#charlieCursor` est présent dans la page ;
- il suit les coordonnées du pointeur sans intercepter les clics ;
- un clic déclenche l'animation courte de Charlie ;
- le mode réduit les animations lorsque l'utilisateur le demande.

## Son

La V1 n'associe aucun son dédié à Charlie. Aucun nouveau son n'a donc été ajouté.

## Nettoyage

Le contrôleur retire les écouteurs clavier et pointeur, annule son timer, enlève la
classe temporaire du `body` et nettoie les styles du curseur lors de sa destruction.

## Vérifications

- activation et désactivation par la séquence complète ;
- aucune activation pendant la saisie dans un formulaire ;
- déplacement du curseur et nettoyage des listeners ;
- déblocage unique du succès associé ;
- 113 tests unitaires réussis, 0 échec ;
- syntaxe JavaScript et disponibilité de l'asset vérifiées ;
- aucun fichier V1 modifié par ce lot.

La vérification pilotée dans le navigateur intégré n'a pas pu être achevée car sa
connexion locale s'est interrompue pendant le rechargement.

## Prochaine migration proposée

Migrer l'easter egg Toom de manière isolée avec son déclencheur, ses réactions,
son nettoyage et son succès associé.
