# V2 - Phase 5 - Easter egg 1 : œuf secret

## Périmètre

Ce premier lot migre uniquement l'œuf secret qui prépare l'accès aux catégories
Secret et Easter Eggs. Les autres easter eggs seront migrés séparément afin de
conserver leurs déclencheurs, animations, sons et nettoyages exacts.

## Comportement migré

- l'œuf reste discret dans l'angle inférieur droit tant qu'il n'a pas été récupéré ;
- sa collecte est unique et enregistrée dans les succès partagés du compte ;
- la collecte ne débloque pas directement les catégories secrètes ;
- le bouton « Œuf scellé » du panneau Succès devient ensuite utilisable ;
- une notification confirme la récupération ;
- le contrôleur retire ses écouteurs lors de sa destruction.

## Ajustement Galerie

Le texte explicatif « Mémoire de la galerie » a été retiré des paramètres. Le
bouton de réinitialisation reste disponible et la galerie demeure liée au compte,
ou au navigateur pour un invité, sans option de partage par profil.

## Vérifications

- collecte immutable et persistante ;
- double collecte impossible ;
- 112 tests unitaires réussis, 0 échec ;
- syntaxe des modules et asset de l'œuf vérifiés ;
- aucun fichier V1 modifié par ce lot.

La vérification pilotée dans le navigateur intégré n'a pas pu être exécutée car sa
connexion locale ne répondait pas. Le prochain lot ne doit commencer qu'après la
validation manuelle de ce premier easter egg.

## Prochaine migration proposée

Migrer l'easter egg Charlie avec son déclencheur, son état, son DOM, ses timers,
son son, son nettoyage et son succès associés.
