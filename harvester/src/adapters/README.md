# Adaptateurs

Chaque fichier de ce dossier correspond à **un fournisseur externe** et implémente le contrat `BaseAdapter` défini dans `../core/base-adapter.ts`.

## Règles

- Un adaptateur = un fichier, une responsabilité, moins de 100 lignes.
- Le nom de l'adaptateur sert de nom de file BullMQ (`harvest:<name>`) : il doit être stable.
- Le payload d'un job ne contient que des identifiants (`externalId`, `parentId?`).
- La réponse brute est validée par Zod avant toute écriture.
- Le brut est conservé dans `external_api_cache`, puis l'entité est upsertée sur `(source, external_id)`.
- Les sous-ressources sont reprogrammées via `dispatchNextJob`, jamais traitées en boucle synchrone.
- Un `429` doit lever `HttpError` (via `fetchJson`) pour que la file soit gelée.

## Modèle

`example.adapter.ts` et `example-photo.adapter.ts` montrent le cycle complet. Ils sont désactivés par défaut et activés avec `HARVESTER_ENABLE_EXAMPLE=1`.

## Checklist d'ajout

- [ ] Schéma Zod du format brut.
- [ ] URL et en-têtes d'authentification via variables d'environnement serveur.
- [ ] `rateLimit` conforme à la documentation du fournisseur.
- [ ] Upsert idempotent du cache et de l'entité.
- [ ] Dispatch des enfants.
- [ ] Test d'idempotence et test de rate-limit.
- [ ] Enregistrement dans `../index.ts`.
