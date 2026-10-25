# Frontend (React Native + Expo)

L'application frontend est conçue avec **Expo** et **React Native**. Une seule base de code produit :

- une **single page app Web** (React Native Web / Expo Router),
- une application **Android** native,
- une application **iOS** native (build EAS ou simulateur macOS).

## Lancement

Le plus simple est d'utiliser le script racine, qui prépare l'environnement et lance Expo :

```bash
./start.sh
```

Puis :

- `w` : Web (SPA)
- `a` : Android
- `i` : iOS (macOS uniquement)

## Lancement manuel

```bash
npm ci
npx expo start -c --port 8081
```

## Environnement

- `frontend/.env` est généré et **régénéré à chaque lancement** par `start.sh` avec uniquement les variables `EXPO_PUBLIC_*` et `PORT`. Les secrets serveur (base de données, SMTP, clés API privées) ne sont jamais exposés au processus Expo.
- Le `.env` racine est la source de vérité : ajoutez-y les variables publiques avec le préfixe `EXPO_PUBLIC_`.
- La variable `EXPO_PUBLIC_API_URL` doit pointer vers l'API (`http://localhost:3000` en développement).
- **Android** : dans l'émulateur, `localhost` désigne l'émulateur lui-même. Utiliser `http://10.0.2.2:3000` (ou l'IP LAN de la machine pour un appareil physique).
- **iOS / Web** : `http://localhost:3000` fonctionne.

## Dépendances

- Node.js 20+ (Node 22 recommandé).
- `npm ci` utilise `package-lock.json` pour une installation reproductible.
