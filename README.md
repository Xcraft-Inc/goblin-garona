# 📘 goblin-garona

## Aperçu

**goblin-garona** est un module de surveillance et de métriques pour l'écosystème Xcraft. Il collecte, agrège et expose les métriques système et client au format Prometheus, permettant un monitoring centralisé des applications Xcraft. Le module peut optionnellement exposer une API REST pour consulter ces métriques en temps réel.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Configuration avancée](#configuration-avancée)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module est organisé autour d'un acteur Goblin singleton qui :

- Collecte les métriques système via le bus Xcraft
- Agrège les métriques des clients distants
- Formate les données au standard Prometheus
- Expose optionnellement une API REST pour la consultation

**Composants principaux :**

- **Acteur Garona** : Collecteur et agrégateur de métriques singleton
- **API REST** : Interface HTTP optionnelle pour l'exposition des métriques
- **Système de formatage** : Conversion des métriques au format Prometheus

## Fonctionnement global

Garona fonctionne comme un hub central de métriques :

1. **Collecte système** : Récupère les métriques du bus Xcraft local via `bus.{appId}.xcraftMetrics`
2. **Collecte client** : Reçoit les métriques des clients distants via `logRemoteMetrics`
3. **Formatage** : Convertit toutes les métriques au format Prometheus avec sanitisation des noms
4. **Exposition** : Met à disposition les métriques via des quêtes ou une API REST

Le module utilise un système d'événements pour déclencher la collecte des métriques clients et applique des transformations pour respecter les conventions de nommage Prometheus. Les métriques sont exposées via deux endpoints distincts : `/metrics` pour les métriques système et `/clients-metrics` pour les métriques des clients distants.

## Exemples d'utilisation

### Récupération des métriques système

```javascript
// Obtenir les métriques au format Prometheus
const metrics = yield this.quest.cmd('garona.metrics');
console.log(metrics); // Format texte Prometheus
```

### Envoi de métriques client

```javascript
// Depuis un client distant
yield this.quest.cmd('garona.logRemoteMetrics', {
  clientSessionId: 'session-123',
  pid: process.pid,
  metrics: {
    'app.requests.total': {
      value: 1542,
      labels: {method: 'GET', status: '200'}
    }
  }
});
```

### Récupération des métriques clients

```javascript
// Déclenche la collecte et retourne les métriques clients
const clientMetrics = yield this.quest.cmd('garona.clientsMetrics');
// Attend 10 secondes pour la collecte puis retourne les données
```

### Exemple de requête Prometheus

```promql
# Exemple de requête pour filtrer les métriques
{__name__=~"^polypheme_dev_.*desktop.*workitems_total"}
```

## Interactions avec d'autres modules

- **[goblin-tradingpost]** : Utilisé pour exposer l'API REST quand `api.enabled` est activé
- **[xcraft-core-etc]** : Gestion de la configuration du module
- **[xcraft-core-goblin]** : Framework de base pour l'acteur Garona
- **Bus Xcraft** : Communication avec `bus.{appId}.xcraftMetrics` pour collecter les métriques système

## Configuration avancée

| Option          | Description                                                       | Type      | Valeur par défaut         |
| --------------- | ----------------------------------------------------------------- | --------- | ------------------------- |
| `appId`         | Identifiant de l'application utilisé pour récupérer les métriques | `string`  | `"$"`                     |
| `api.enabled`   | Active l'exposition de l'API REST                                 | `boolean` | `false`                   |
| `api.host`      | Adresse d'écoute de l'API                                         | `string`  | `"127.0.0.1"`             |
| `api.port`      | Port d'écoute de l'API                                            | `number`  | `8500`                    |
| `api.keys`      | Clés d'API pour l'authentification                                | `array`   | `[]`                      |
| `api.serverUrl` | URL publique du serveur                                           | `string`  | `"http://127.0.0.1:8500"` |

## Détails des sources

### `garona.js`

Point d'entrée du module qui expose les commandes Xcraft via `xcraftCommands`. Ce fichier suit le pattern standard Xcraft pour l'exposition des services.

### `lib/service.js`

Implémentation principale de l'acteur Garona avec les fonctionnalités suivantes :

#### État et modèle de données

L'acteur maintient :

- **`appId`** : Identifiant de l'application configuré
- **`remoteMetrics`** : Cache des métriques clients indexées par `clientSessionId_pid`

#### Méthodes publiques

- **`init()`** — Initialise l'acteur, charge la configuration et démarre optionnellement l'API REST. Configure le tradingpost avec les endpoints `/metrics` et `/clients-metrics` si l'API est activée.

- **`metrics()`** — Collecte et retourne les métriques système au format Prometheus. Interroge le bus Xcraft via `bus.{appId}.xcraftMetrics` et applique le formatage standard.

- **`clientsMetrics()`** — Déclenche la collecte des métriques clients via l'événement `client-metrics-requested`, attend 10 secondes pour permettre aux clients de répondre, puis retourne et vide le cache des métriques clients.

- **`logRemoteMetrics(clientSessionId, pid, metrics)`** — Enregistre les métriques d'un client distant dans le cache interne, indexées par l'identifiant unique `clientSessionId_pid`.

#### Fonctions utilitaires

**Sanitisation des noms** : La fonction `sanitizeName()` convertit les noms de métriques pour respecter les conventions Prometheus :

- Supprime le hostname (premier segment après le point)
- Convertit les identifiants hexadécimaux longs en majuscules
- Transforme les caractères non-alphanumériques en underscores
- Applique un préfixe optionnel pour les métriques clients

**Formatage des métriques** : Les fonctions `extractMetrics()` et `groupMetrics()` transforment les données internes en format Prometheus avec support des :

- **Labels** : Formatage `{labelName="labelValue"}`
- **Timestamps** : Support optionnel des horodatages
- **Métadonnées** : Directives `# HELP` et `# TYPE` pour la documentation
- **Métriques composées** : Support des objets avec suffixes (`_total`, `_count`, etc.)

#### Configuration de l'API REST

Quand l'API est activée, le module configure deux endpoints :

- **`GET /metrics`** : Retourne les métriques système au format `text/plain;version=0.0.4`
- **`GET /clients-metrics`** : Retourne les métriques clients agrégées

L'API utilise le système d'authentification par clés de [goblin-tradingpost] et expose automatiquement la documentation Swagger.

---

_Documentation mise à jour automatiquement pour goblin-garona v2.0.4_

[goblin-tradingpost]: https://github.com/Xcraft-Inc/goblin-tradingpost
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
[xcraft-core-goblin]: https://github.com/Xcraft-Inc/xcraft-core-goblin