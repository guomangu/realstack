# Veille Technique par Technologie

Ce dossier accueille les notes de veille, extraits de documentation et exemples par technologie. **Il ne remplace pas** les documents de référence du projet : la source de vérité reste [`../stack_universelle.md`](../stack_universelle.md) et les documents de fonctionnalité de [`../`](../README.md).

| Dossier | Sujet |
| :---- | :---- |
| `drizzle-docs/` | Drizzle ORM, migrations, PostGIS |
| `expo-docs/` | Expo, EAS, rendu universel |
| `harvester-docs/` | Documentation officielle **Harvester HCI (SUSE)** : virtualisation, stockage, réseau (à ne pas confondre avec notre worker `harvester/`, documenté dans [`../harvester.md`](../harvester.md)). |
| `hono-docs/` | Hono, middlewares, validation |
| `podman-docs/` | Podman rootless, SELinux, Compose |
| `react-native-docs/` | Composants et performance mobile |

## Règles

- Un fichier = une source ou un sujet précis, avec sa date de consultation.
- Toujours indiquer la version concernée.
- Ne pas copier de secrets, de clés ou de données personnelles.
- Lorsqu'une note contredit la documentation du projet, mettre à jour le document de référence et signaler l'écart.

Le script `extracteur_de_documentation_api_data_gouv_fr.sh` sert à extraire la documentation de l'API data.gouv.fr.
