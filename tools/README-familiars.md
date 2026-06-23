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

Le bouton `Telecharger JSON` exporte une fiche du familier. Cette fiche peut ensuite etre donnee a Codex pour integration.

## Template

Un exemple de sortie est disponible dans :

```txt
tools/familiar-template.example.json
```

Il sert de reference si l'interface HTML n'est pas pratique pour un cas particulier.
