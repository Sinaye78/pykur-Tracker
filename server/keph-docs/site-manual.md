# Manuel complet Keph - Charlie Roulette

Ce manuel decrit le site du point de vue d'un organisateur de live.
Keph doit l'utiliser pour repondre de facon precise, naturelle et utile.

## Principe du site

Charlie Roulette est une regie de tirage en live. L'organisateur prepare une file de participants, une roue de lots, des stocks, des sons, des dialogues et des effets de scene. Pendant le live, il pilote la roue avec une regie simple pendant que le public voit une scene propre pour Discord ou OBS.

Le site n'est pas seulement une roulette aleatoire. C'est un outil d'animation : il gere le rythme, les annonces, les dialogues de Charlie/Victoria, les jingles, les resultats, l'historique et les sauvegardes.

## Les deux espaces principaux

La scene publique est ce que le public doit voir : la roue, le participant actuel, le resultat, les personnages, les dialogues et les effets.

La regie est l'espace de controle de l'organisateur : Lancer, Stop, Suivant, dernier tirage, alertes, checklist, dialogues et acces aux reglages. Les boutons de regie ne doivent pas polluer la capture Discord/OBS.

La configuration sert a preparer le live. Elle est plus large que la regie et regroupe les participants, les lots, les stocks, la roue, les scenes, les sons et les donnees.

## Regie live

Le mode Live simple garde seulement ce qui sert pendant le direct : participant actuel, Lancer, Stop, Suivant, dernier tirage, etat du live, dialogues rapides, simulation et checklist.

Le mode Reglages ouvre la configuration plus complete. L'idee est de ne pas piloter un live au milieu de quarante options.

Lancer demarre un vrai tirage. Il peut consommer un stock, ecrire dans l'historique et retirer un lancer au participant. Il faut l'utiliser seulement quand le participant et les lots sont prets.

Stop arrete la roue quand un vrai tirage est en cours. S'il est grise, c'est normal si la roue n'est pas en train de tourner.

Tirage test sert a tester la roue sans consequence. Il ne consomme pas de stock, ne change pas l'historique et ne retire pas de lancer.

Suivant charge le prochain participant de la file. Il met a jour le participant affiche et le contexte utilise par les dialogues.

Dernier tirage resume le resultat recent pour aider l'organisateur a reprendre le fil.

## Participants

Un participant est un candidat qui passe sur la roue. Le participant actuel est celui affiche sur la scene et utilise par les dialogues.

La file de participants contient les pseudos a faire passer. Un pseudo par ligne suffit pour charger la file.

Chaque participant peut avoir un nombre de lancers. Si Kinza a 5 lancers, les vrais tirages doivent descendre son compteur. Les tirages test et simulations ne doivent pas le modifier.

Quand un participant n'a plus de lancer, l'organisateur peut passer au suivant.

La file d'attente ou file de participants se gere dans Preparer. L'organisateur saisit les pseudos, charge la liste, puis utilise Suivant pour avancer. Dans la liste complete, il peut modifier le nombre de lancers, monter ou descendre un candidat, rejouer un participant ou le retirer.

## Lots et roue

Les lots sont les cases de la roue. Chaque lot peut avoir un nom, un poids, une activation, un stock, un texte, une couleur et parfois une image PNG.

Le poids controle la chance relative d'un lot. Un poids 20 a environ deux fois plus de chances qu'un poids 10, si les autres lots restent identiques.

Le stock permet de limiter un lot. Si le stock est active et arrive a zero, le lot devient indisponible. La case doit apparaitre grisee et la roue ne doit plus pouvoir tomber dessus.

Desactiver un lot le retire des tirages sans supprimer sa configuration. C'est utile pour garder un lot de cote.

Design & PNG ne change pas les chances. Cette zone sert seulement a rendre la roue lisible : texte, taille, position, rotation, image, couleur et apparence.

## Studio de la roulette

Le Studio de la roulette est le grand panneau pour travailler la roue.

Lots & probabilites sert a modifier les noms des lots, les poids, l'activation et les stocks.

Design & PNG sert a ajuster le rendu visuel des cases. Si un texte deborde, si une image est mal placee ou si une case est illisible, c'est ici qu'il faut aller.

Keph doit distinguer ces deux usages : probabilites et stock changent le comportement du tirage; design et PNG changent seulement l'apparence.

## Scenes et spectacle

La partie Scenes gere ce que Charlie et Victoria disent ou font pendant le live. Elle donne de la vie au tirage.

Presenter les candidats lance une introduction de spectacle. Cela annonce les candidats et installe l'ambiance. Cela ne lance pas la roue, ne consomme aucun stock et n'ecrit rien dans l'historique.

Jingle debut lance l'ouverture sonore/visuelle du show.

Annoncer le candidat met en avant le participant actuel avant son tirage.

Scene finale lance la cloture du show.

Les presets de scene servent a adapter vite l'ambiance : tirage normal, pause, annonce candidat, resultat ou finale.

## Studio de scenarios

Le Studio de scenarios est l'editeur des repliques. Il organise les dialogues par etape :

- Presentation
- Jingle
- Temps mort
- Pendant la roue
- Apres le resultat
- Candidat suivant
- Scene finale

Une replique peut avoir un personnage, un type, un ciblage, une emote, un effet special et un bruitage.

Charlie et Victoria sont les personnages de mise en scene. Charlie est l'animateur principal. Victoria accompagne, commente, annonce ou relance l'ambiance.

Dialogue parle affiche une vraie bulle de parole.

Indication scenique est plus discrete : elle decrit une action comme un /me. Exemple : Charlie observe la roue.

Le ciblage choisit pour qui la replique peut se jouer. Tous les candidats signifie general. Candidat actuel suit la personne en train de passer. Candidat cible limite la replique a un pseudo precis.

## Emotes, effets et bruitages

Les emotes donnent une emotion visible a une replique. Elles doivent rester adaptees a la taille de la bulle et au contexte.

Les effets speciaux donnent un impact visuel. Exemples : confettis, feu d'artifice, flash plateau, coupure lumiere, projecteurs, spotlight, shake leger, glitch, pluie d'etoiles, fumee, vague doree et alerte rouge.

Un bruitage est un son attache a une replique. Il se regle dans le Studio de scenarios, champ Bruitage. Si le son n'est pas dans la bibliotheque, le bouton Importer permet d'ajouter un MP3, WAV ou OGG et de l'assigner a la replique.

Il ne faut pas confondre Sons et Bruitage de replique. Sons gere les volumes globaux et les jingles; le bruitage de replique se regle sur la replique.

## Sons

La section Sons gere le mute global, le volume des jingles, le volume de la roulette et les sons de scene.

Si le son est coupe, Keph doit prevenir que le mute global peut empecher d'entendre les jingles ou bruitages.

Les jingles servent aux moments de show : debut, transition, finale ou scene particuliere.

## Discord et OBS

La scene Discord/OBS doit etre propre. Le public doit voir la roue, le participant, les dialogues, les effets et le resultat, pas les boutons admin.

Detacher la regie ouvre les controles dans une fenetre separee. C'est utile pour capturer la scene principale dans Discord/OBS tout en gardant Lancer, Stop, Suivant et les reglages sous la main.

Plein ecran sert a presenter plus proprement la scene publique.

## Simulation et checklist

Simuler un passage sert a repeter le rythme avant le live. Cela enchaine un passage fictif sans toucher aux stocks, a l'historique ou aux lancers.

La checklist pre-live verifie les points importants : participants charges, lots disponibles, stocks OK, son actif, scene Discord propre et raccourcis configures.

Les alertes intelligentes previennent avant une erreur : lots indisponibles, stock manquant, file bientot terminee, son coupe ou etat de scene incoherent.

## Historique et sauvegarde

L'historique liste les vrais tirages. Il peut servir a retrouver le dernier gagnant, les lots obtenus, le total de tirages et les gagnants par participant.

Corriger le dernier tirage sert si un resultat a ete valide par erreur.

Exporter CSV sert a recuperer l'historique dans un fichier.

Exporter/importer profil sert a sauvegarder toute une configuration : participants, lots, stocks, dialogues, sons, raccourcis et options.

## Raccourcis clavier

Les raccourcis permettent de piloter sans viser les boutons. Exemple : Espace pour Lancer, Entree pour Stop, J pour Jingle, P pour Presenter.

Les touches affichees entre parentheses sur les boutons aident l'organisateur pendant le live.

Les raccourcis doivent rester configurables, car chaque organisateur peut avoir ses habitudes.

## Keph

Keph est l'assistant de regie. Il doit pouvoir expliquer une option, retrouver un menu, ouvrir le bon panneau, surligner un champ et proposer certaines actions a confirmer.

Keph doit rester humain sur les questions humaines. Si l'utilisateur dit "coucou la forme ?", il repond normalement, sans forcer une fiche technique.

Keph doit etre precis sur les questions du site. Si l'utilisateur demande "a quoi sert le bouton lancer ?", il doit parler du vrai tirage, pas du principe global du site.

Keph doit eviter les reponses vagues. Il doit dire ou aller, quoi faire et ce que l'action change ou ne change pas.

Les likes indiquent un bon style ou une bonne information. Les dislikes deviennent des cas a corriger. Une mauvaise reponse peut etre marquee "Doc" si elle doit enrichir la documentation, ou "Corrige" si un patch regle le probleme.

## Inventaire des boutons principaux

Ouvrir configuration affiche la grande interface de preparation. C'est fait pour regler sans compresser toute la configuration dans la regie.

Fermer configuration revient a la vue live/regie. C'est utile quand les reglages sont termines.

Plein ecran agrandit la scene publique. Il sert surtout a presenter ou capturer proprement.

Afficher configuration ouvre les reglages depuis la vue principale.

Detacher la regie ouvre la regie dans une fenetre separee. C'est la meilleure option pour OBS/Discord : scene propre d'un cote, controles de l'autre.

Presenter les candidats lance la scene d'introduction. Cette action joue les dialogues de l'etape Presentation.

Jingle debut lance l'ouverture sonore/visuelle. Il peut utiliser une piste audio configuree.

Annoncer le candidat lance une scene centree sur le participant actuel.

Scene finale lance les dialogues et effets de cloture.

Passer ou Fermer une scene interrompt la scene en cours et rend la regie disponible.

Reinitialiser les raccourcis remet les touches par defaut.

## Etats du live

Pret signifie que l'organisateur peut lancer une action. Les boutons essentiels doivent etre disponibles.

Roue en cours signifie que le tirage est lance. L'organisateur doit attendre ou utiliser Stop quand il devient possible.

Stop possible signifie que la roue peut etre arretee.

Resultat signifie qu'un lot vient d'etre obtenu et que le site attend la validation ou la transition.

Scene en cours signifie qu'un jingle, une presentation, une annonce ou une finale est en train de jouer.

## Reglages de tirage

Anti-repetition evite que la roue donne trop souvent le meme lot.

Mode "Eviter seulement le dernier lot" empeche seulement le lot precedent de retomber immediatement, si d'autres lots sont disponibles.

Mode "Un seul passage par lot" essaie de faire sortir chaque lot une fois avant de recommencer une rotation de session.

Lot force pour un tirage test permet de choisir le resultat d'un test. Cela ne doit jamais influencer un vrai tirage.

Refus troll au lancement permet a Charlie de refuser parfois de lancer la roue pour ajouter une blague. La frequence des refus controle la probabilite de ce gag.

Reactions de Charlie active les petites interventions automatiques, par exemple quand il commente, attend ou taquine.

Temperament de Charlie change le ton general des interventions.

## Reglages de spectacle

Activer Charlie Show active les interventions de Charlie et Victoria. Si c'est coupe, la roue reste plus sobre.

Dialogues inclus active les repliques par defaut fournies avec le site. Si c'est coupe, seules les repliques personnalisees et certains textes systeme restent disponibles.

Annoncer automatiquement le candidat suivant declenche une scene apres un tirage valide pour preparer la suite.

Frequence des interventions controle le nombre d'interventions automatiques : rare, normale, frequente ou tres frequente.

Avancement des dialogues en mode automatique fait avancer apres une duree. En mode clic, l'organisateur clique pour passer a la replique suivante.

Duree auto controle combien de secondes une replique reste affichee en mode automatique.

## Modes de lecture des etapes

Une replique par passage dans l'ordre joue une seule replique, puis avance dans la liste au prochain passage.

Une replique par passage aleatoire choisit une seule replique au hasard.

Toutes les repliques dans l'ordre joue toute la sequence de l'etape.

Une sequence alternative complete au hasard sert a creer plusieurs variantes d'une scene, puis en jouer une complete.

Previsualiser l'etape lance un test visuel de l'etape choisie.

Dupliquer l'etape copie les repliques d'une etape pour gagner du temps.

Dupliquer le scenario copie le scenario complet.

Annuler revient sur une modification recente quand c'est possible.

## File de dialogues live

La file de dialogues permet de controler ce qui va etre dit ensuite.

Auto laisse le site ajouter et jouer les dialogues selon la scene.

Manuel donne la main a l'organisateur. Les repliques entrent dans une file et l'organisateur utilise Suivant, Passer ou Rejouer.

Suivant joue la prochaine replique de la file.

Passer saute la prochaine replique.

Rejouer relance la derniere replique.

Vider nettoie la file de dialogues.

Forcer une replique rapide ajoute une phrase en tete de file pour improviser.

La previsualisation de file montre les trois prochains dialogues et peut permettre de reorganiser l'ordre.

## Bibliotheque audio

Importer un MP3, WAV ou OGG ajoute un fichier a la bibliotheque audio du show.

Ecouter permet de previsualiser un son importe.

Supprimer retire un son de la bibliotheque et enleve ses assignations des repliques ou scenes.

Les pistes de scene permettent d'associer un son a Presentation, Jingle, Temps mort, Pendant la roue, Resultat, Candidat suivant ou Finale.

Les assignations Jingle debut, Jingle fin et Son roulette remplacent les sons systeme par des sons personnalises.

Un son de scene peut boucler pendant qu'une scene est ouverte.

Un bruitage de replique est joue au moment de la replique, pas en fond de scene.

## Variables et textes de dialogue

Les dialogues peuvent utiliser des informations de contexte comme le participant actuel, le candidat suivant, le dernier lot obtenu, le lot concerne, le nombre de candidats ou le nombre de gagnants.

Keph doit expliquer ces variables comme des raccourcis de texte dynamique. Exemple : une replique peut dire le nom du candidat actuel sans l'ecrire en dur.

Si l'utilisateur demande comment personnaliser une phrase pour un candidat precis, Keph doit parler du ciblage "Candidat cible".

## Actions possibles de Keph

Keph peut ouvrir les panneaux : Preparer, Lots & roue, Studio de la roulette, Studio de scenarios, Sons, Sauvegarde.

Keph peut proposer de modifier le poids d'un lot, renommer un lot, ajouter une replique, ajouter un participant, jouer un effet, previsualiser une etape, jouer le jingle ou simuler un evenement.

Keph doit confirmer ou expliquer avant les actions qui modifient vraiment la configuration. En live, il vaut mieux eviter toute action destructrice automatique.

Keph ne doit pas inventer une action si elle n'existe pas. S'il ne peut pas faire, il doit dire clairement ou cliquer.

## Logs et apprentissage

Le bouton Logs affiche les dislikes recents et leur categorie.

Une categorie "hors sujet" signifie que Keph a repondu a cote.

Une categorie "trop vague" signifie que la reponse manque d'etapes ou de precision.

Une categorie "faux" signifie que Keph a affirme une fonction qui n'existe pas ou une information incorrecte.

Une categorie "action manquante" signifie que l'utilisateur voulait une modification concrete.

Une categorie "mauvaise cible" signifie que Keph a confondu le candidat, le lot, le personnage ou le contexte.

Marquer "Doc" signifie que ce cas doit enrichir la documentation.

Marquer "Corrige" signifie qu'un patch ou une doc a deja regle ce cas.

## Questions typiques a savoir traiter

"A quoi sert le site ?" doit expliquer le principe global de regie de tirage live.

"A quoi sert Lancer ?" doit parler d'un vrai tirage et de ses consequences.

"Comment ajouter un son sur un dialogue ?" doit pointer vers le Studio de scenarios, champ Bruitage, bouton Importer.

"Pourquoi Stop est grise ?" doit expliquer qu'il faut une roue en cours.

"Pourquoi un lot est indisponible ?" doit parler de stock a zero ou de lot desactive.

"Comment modifier le poids d'un lot ?" doit pointer vers Lots & probabilites.

"Comment changer l'image d'une case ?" doit pointer vers Design & PNG ou chemin PNG.

"Comment faire une scene Discord propre ?" doit conseiller mode scene propre et regie detachee.

"Qui est Victoria ?" doit presenter Victoria comme personnage de scene, pas expliquer genericement les dialogues.

"Coucou la forme ?" doit rester une reponse humaine simple.

## Style de reponse attendu

Pour une question simple, repondre directement en une ou deux phrases.

Pour "comment faire", donner des etapes courtes.

Pour "a quoi ca sert", expliquer l'usage live et les consequences.

Pour une demande d'action, proposer une action a confirmer ou executer seulement les actions autorisees.

Pour une question hors site, repondre normalement sans ramener lourdement au site.
