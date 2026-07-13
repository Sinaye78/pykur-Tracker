# Exemple de documentation Keph

Ce fichier est une version lisible de la logique utilisee par Keph.
La vraie doc exploitee par le serveur est ici :

`../server/keph-docs/site.json`

Objectif : Keph doit repondre vite aux questions frequentes, puis utiliser Ollama seulement pour les questions nouvelles ou complexes.

## Structure d'une entree

```json
{
  "id": "live_controls",
  "section": "before",
  "title": "Boutons de regie live",
  "keywords": ["lancer", "stop", "suivant", "tirage test", "regie"],
  "instant": true,
  "answer": "Lancer demarre un vrai tirage...",
  "actions": ["open_prepare"],
  "examples": [
    "a quoi sert le bouton lancer ?",
    "a quoi sert stop ?"
  ]
}
```

## Champs importants

- `id` : identifiant stable du sujet.
- `section` : zone de configuration concernee.
- `title` : titre humain du sujet.
- `keywords` : mots ou expressions qui aident Keph a retrouver la bonne fiche.
- `instant` : si `true`, Keph peut repondre sans appeler Ollama.
- `answer` : reponse verifiee, courte et utile en live.
- `actions` : boutons que Keph peut afficher, par exemple ouvrir le studio.
- `examples` : vraies questions utilisateur a reconnaitre.

## Exemple : bouton Lancer

Question :

> a quoi sert le bouton lancer ?

Reponse attendue :

> Lancer demarre un vrai tirage. Il peut consommer un stock, ecrire l'historique et retirer un lancer au participant. Pour tester sans consequence, utilise Tirage test ou Simuler un passage.

Pourquoi c'est important :

Keph ne doit pas repondre avec la fiche generale du site. La question parle d'un bouton precis.

## Exemple : Studio

Question :

> a quoi sert le studio ?

Reponse attendue :

> Les studios sont les grands panneaux de configuration. Le Studio de la roulette sert aux lots, poids, stocks, images et textes. Le Studio de scenarios sert aux repliques, emotes, effets et bruitages.

Pourquoi c'est important :

Le mot `studio` est vague. La reponse doit expliquer les deux studios au lieu de partir sur "a quoi sert le site".

## Exemple : conversation normale

Question :

> coucou la forme ?

Reponse attendue :

> Salut, ca va bien, merci. Je suis pret a t'aider sur la regie ou ce qui te bloque.

Pourquoi c'est important :

Keph doit rester humain quand la question est humaine. Il ne doit pas forcer une fiche technique.

## Transformer un dislike en amelioration

Quand une mauvaise reponse est dislikee :

1. Regarder le panneau `Logs`.
2. Identifier la categorie : hors sujet, trop vague, faux, action manquante, mauvaise cible.
3. Ajouter ou modifier une entree dans `../server/keph-docs/site.json`.
4. Ajouter la question au banc de test si elle doit rester protegee.
5. Marquer le feedback comme `Doc` ou `Corrige` dans les Logs.

## Banc de test automatique

Le banc de test est ici :

`../server/scripts/keph-test-bench.js`

Commande :

```bash
npm run test:keph
```

Ou contre une autre API :

```bash
KEPH_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:keph
```

Le test envoie une cinquantaine de questions et verifie que la reponse contient des mots attendus.
Ce n'est pas un test parfait de style, mais c'est tres utile pour detecter les grosses regressions.
