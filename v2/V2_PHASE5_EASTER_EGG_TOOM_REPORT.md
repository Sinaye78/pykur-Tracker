# V2 - Phase 5 - Easter egg 3 : Toom

## Déclencheur

Saisir `toom` hors d'un champ de formulaire active ou désactive l'easter egg.
Charlie et Toom utilisent désormais un routeur clavier commun, conçu pour accueillir
les futurs codes sans conflit avec les raccourcis du tracker.

## État

- l'état visuel est temporaire et n'est pas restauré après rechargement ;
- le succès `egg_toom` est enregistré lors de la première activation ;
- retaper `toom` retire la scène et affiche le retour de Nipsey.

## DOM et animation

- une scène unique `#toomOverlay` contient la NRG, l'avatar et la fumée ;
- l'overlay est non interactif et ne bloque aucun clic ;
- la NRG effectue un mouvement lent avec une fumée légère ;
- les animations sont supprimées lorsque le mouvement réduit est demandé ;
- le rendu compact de la V1 est conservé sur petit écran.

## Notifications et son

- une notification dédiée reprend les couleurs de Toom lors de l'activation ;
- une notification d'avertissement annonce le retour de Nipsey ;
- aucun son dédié n'existe dans la V1, donc aucun son n'a été ajouté.

## Nettoyage

Le contrôleur enlève ses classes temporaires lors de sa désactivation ou de sa
destruction. Le routeur commun retire également son listener clavier.

## Vérifications

- activation et désactivation par la séquence complète ;
- saisie ignorée dans les formulaires ;
- succès `egg_toom` transmis au module Succès ;
- classes d'overlay et du `body` nettoyées ;
- 115 tests unitaires réussis, 0 échec ;
- syntaxe, assets et ressources HTTP locales vérifiés ;
- aucun fichier V1 modifié par ce lot.

La vérification pilotée dans le navigateur intégré n'a pas pu être achevée car sa
connexion locale s'est interrompue pendant le rechargement.

## Prochaine migration proposée

Migrer l'easter egg Aina de manière isolée, y compris son interaction avec le
Dofus Ivoire, ses réactions et son nettoyage.
