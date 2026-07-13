# API gratuite pour Keph

Keph fonctionne en trois niveaux :

1. Reponses verifiees instantanees depuis la documentation du site.
2. API distante gratuite si une cle est configuree.
3. Ollama local en secours, plus lent sur le VPS.

## Option recommandee : Groq

Groq est le choix recommande pour Keph parce que les reponses sont rapides et le modele `llama-3.1-8b-instant` supporte le JSON.

Variables a mettre dans `server/.env` sur le VPS :

```env
GROQ_API_KEY=ta_cle_groq
KEPH_REMOTE_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
KEPH_REMOTE_TIMEOUT_MS=7000
```

## Autres options gratuites possibles

Gemini :

```env
GEMINI_API_KEY=ta_cle_gemini
KEPH_REMOTE_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash-lite
```

OpenRouter :

```env
OPENROUTER_API_KEY=ta_cle_openrouter
KEPH_REMOTE_PROVIDER=openrouter
OPENROUTER_MODEL=openrouter/free
```

## Comportement attendu

- Une question connue comme "a quoi sert le bouton lancer ?" ne part pas en API : Keph repond instantanement depuis la doc.
- Une question ouverte ou generale peut partir vers l'API gratuite.
- Si l'API est absente, lente ou plante, Keph retombe sur le guide/documentation sans casser la chatbox.
