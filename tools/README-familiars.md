# Outils familiers

Ces outils servent a eviter les oublis quand de nouveaux familiers sont ajoutes.

## Validateur

Commande :

```bash
node tools/validate-familiars.js
```

Le script lit `familiers/pykur/data/familiars.js` et verifie :

- les champs obligatoires de chaque familier ;
- les images principales, terminees, endormies, fonds, icones, donjons et sprites ;
- les donjons declares dans `FAMILIARS` ;
- les `runLimits`, `mobs`, `gains` et `zoneIds` du runtime ;
- les gains de donjon qui pointeraient vers un monstre absent ;
- les categories de monstre inconnues ;
- l'integration generale catalogue, galerie, projection, detection Dofus, admin panel et serveur.

Un retour sans erreur veut dire que la base multi-familiers est structurellement saine.
Les avertissements ne bloquent pas forcement, mais ils signalent un point a verifier.

## Builder

Ouvrir :

```txt
tools/familiar-builder.html
```

L'interface permet de remplir :

- identite du familier ;
- bonus libre ;
- assets principaux ;
- donjons ;
- monstres ;
- gains ;
- comportement special ;
- notes utiles pour l'integration.

Les champs techniques comme `id`, `key` et sources normalisees peuvent etre laisses vides.
Le builder les genere automatiquement depuis les noms lisibles :

- `Donjon des Rats de Bonta` devient une key propre ;
- `Kimbo` devient un id de monstre propre ;
- dans les gains, vous pouvez ecrire `"Kimbo": 1` au lieu de connaitre l'id interne ;
- dans les sources, vous pouvez ecrire le nom du donjon ou `zone`.

Pour indiquer les monstres presents dans un donjon, utilisez la zone `Monstres presents dans ce donjon` dans chaque carte donjon :

- cliquez sur `Ajouter` ;
- renseignez le nom du monstre ;
- renseignez la quantite presente dans un run.

Le JSON avance est mis a jour automatiquement. Il reste disponible seulement pour les cas particuliers.

Vous pouvez aussi faire l'inverse, ce qui est souvent plus pratique :

1. creez les donjons ;
2. ajoutez un monstre ;
3. dans sa zone `Presence dans les donjons`, renseignez la quantite pour chaque donjon ou il apparait ;
4. cochez `Disponible en zone` si le monstre peut aussi etre farm hors donjon.

Le builder ajoute alors automatiquement les sources du monstre et les gains de chaque donjon dans l'export JSON.

### Assets PNG

Deux modes sont possibles :

- si un asset existe deja dans le projet, renseignez simplement son chemin comme avant ;
- si vous ajoutez de nouveaux PNG, selectionnez-les dans la zone `Depot PNG`.

Pour les monstres, deux methodes existent :

- importer tous les sprites d'un coup dans `Sprites monstres` ;
- ou choisir le PNG directement dans la carte du monstre avec `Choisir le PNG du monstre`.

Dans le second cas, le chemin du sprite est rempli automatiquement et le fichier sera copie dans le dossier `monstre`.

Le bouton `Pre-remplir les chemins` met automatiquement les chemins dans la fiche.
Le champ `Dossier relatif auto` controle aussi l'emplacement cree. Exemple : `../vitalite/bouloute` creera `vitalite/bouloute` si vous choisissez le dossier `familiers`.

Le bouton `Creer le dossier assets` demande de choisir le dossier `familiers`, puis cree le dossier cible avec :

- les images principales a la racine ;
- le fond dans `fond` ;
- les images de donjon dans `donjon` ;
- les sprites de monstres dans `monstre`.

Selon le navigateur, l'ecriture directe de dossier peut etre refusee. Dans ce cas, l'export JSON reste utilisable et les chemins sont quand meme prepares.

Le bouton `Telecharger JSON` exporte une fiche du familier. Cette fiche peut ensuite etre donnee a Codex pour integration.

La colonne `Export JSON` contient aussi un `Resume rapide` lisible avant le JSON brut :

- nombre de donjons et monstres ;
- monstres ajoutes par chaque donjon ;
- monstres disponibles en zone ;
- avertissements avant export si un donjon est vide, si un monstre n'a pas de source ou si un gain pointe vers un monstre absent.

Cette synthese sert a relire rapidement un familier complexe avant de l'envoyer a Codex.

## Template

Un exemple de sortie est disponible dans :

```txt
tools/familiar-template.example.json
```

Il sert de reference si l'interface HTML n'est pas pratique pour un cas particulier.
